import { NextFunction, Request, Response } from "express";
import PDFDocument from "pdfkit";
import { randomUUID } from "crypto";
import { Op } from "sequelize";
import Chapter from "../models/chapter.model";
import Class from "../models/class.model";
import MockTest from "../models/mock-test.model";
import Parent from "../models/parent.model";
import Student from "../models/student.model";
import Subject from "../models/subject.model";
import User from "../models/user.model";
import { AppError } from "../middlewares/error.middleware";
import {
  generateMockTestWithAi,
  validateMockTestQuestions,
  type MockOption,
  type MockQuestion,
} from "../services/mock-test-ai.service";
import {
  MOCK_TEST_MANAGER_ROLES,
  MOCK_TEST_NEGATIVE_MARKING_MANAGER_ROLES,
  normalizeRole,
  type UserRole,
} from "../utils/roles";
import { buildPagination, getPagination } from "../utils/pagination";
import {
  NEGATIVE_MARKING_PENALTY_OPTIONS,
  computeMockTestScore,
  getSchoolNegativeMarkingRule,
  resolveNegativeMarkingSnapshotForCreate,
  serializeNegativeMarkingSnapshot,
  updateSchoolNegativeMarkingRule,
} from "../services/mock-test-negative-marking.service";
import {
  DEFAULT_MOCK_TEST_DURATION_SECONDS,
  computeAttemptEndsAt,
  deriveQuestionStatuses,
  hasAttemptExpired,
  parseDurationSecondsFromBody,
  parseSubmissionReason,
  serializeAttemptTiming,
  toIsoOrNull,
} from "../services/mock-test-attempt.service";
import {
  applyPdfUnicodeFont,
  detectPdfScriptFromValues,
  ensurePdfFontAvailable,
  ensurePdfFontsInstalled,
  pdfContentRequiresScript,
  writePdfLabelValueLine,
  writePdfTextMixed,
} from "../utils/pdf-fonts";

const allowedLevels = ["easy", "medium", "hard"] as const;
const mockTestManagers = new Set<UserRole>(MOCK_TEST_MANAGER_ROLES);

type CurrentUser = {
  id: number;
  role: UserRole;
};

type MockTestMetrics = {
  score: number | null;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  percentage: number | null;
};

type MockTestTiming = {
  startTime: string | null;
  endTime: string | null;
  timeTakenSeconds: number | null;
  timeTakenMinutes: number | null;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isManagerRole = (role: UserRole) => mockTestManagers.has(role);

const negativeMarkingManagerRoles = new Set<UserRole>(
  MOCK_TEST_NEGATIVE_MARKING_MANAGER_ROLES,
);

const canManageNegativeMarking = (role: UserRole) =>
  negativeMarkingManagerRoles.has(role);

const getRequestSchoolId = (req: Request) => {
  const schoolId = Number(req.schoolId);
  if (!Number.isInteger(schoolId) || schoolId <= 0) {
    throw new AppError("School context is required", 400);
  }
  return schoolId;
};

const mockTestUserInclude = [
  {
    model: User,
    as: "generatedByUser",
    attributes: ["id", "name", "email", "role"],
    required: false,
  },
  {
    model: User,
    as: "assignedByUser",
    attributes: ["id", "name", "email", "role"],
    required: false,
  },
  {
    model: Student,
    as: "student",
    required: false,
    include: [
      {
        model: User,
        attributes: ["id", "name", "email", "role"],
        required: false,
      },
    ],
  },
];

const roundToTwo = (value: number) => Math.round(value * 100) / 100;

const toIsoDateString = (value: unknown, field: string) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new AppError(`${field} must be a valid date`, 400);
  }

  return date.toISOString();
};

const getCurrentUser = (req: Request): CurrentUser => {
  const rawUser = (req as any).user;
  const userId = Number(rawUser?.id);
  const role = normalizeRole(rawUser?.role);

  if (!Number.isInteger(userId) || userId <= 0 || !role) {
    throw new AppError("Unauthorized", 401);
  }

  return { id: userId, role };
};

const toOptionalPositiveInteger = (value: unknown, field: string) => {
  if (value === undefined || value === null || value === "") return undefined;

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${field} must be a positive integer`, 400);
  }

  return parsed;
};

const toPositiveInteger = (value: unknown, fallback: number) => {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue <= 0) return fallback;
  return numberValue;
};

const toOptionalString = (value: unknown) => {
  if (value === undefined || value === null) return undefined;

  const normalized = String(value).trim();
  return normalized || undefined;
};

const toBoolean = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;

  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
};

const getIncludeAnswersParam = (query: Request["query"]) =>
  toBoolean(query.includeAnswers) ||
  toBoolean(query.withAnswers) ||
  toBoolean(query.answers);

const normalizeStudentIds = (value: unknown) => {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string" && value.includes(",")
      ? value.split(",")
      : [value];
  const studentIds = rawValues
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
  const uniqueStudentIds = Array.from(new Set(studentIds));

  if (uniqueStudentIds.length === 0) {
    throw new AppError("studentId or studentIds is required", 400);
  }

  return uniqueStudentIds;
};

const resolveAssignmentStudentIds = async (
  body: Record<string, unknown>,
  mockTest: any,
) => {
  const assignAllInClass =
    body.assignAllInClass === true ||
    body.assignAll === true ||
    String(body.assignAllInClass ?? "").toLowerCase() === "true";

  if (assignAllInClass) {
    const classId =
      toOptionalPositiveInteger(body.classId, "classId") ??
      toOptionalPositiveInteger(mockTest.classId, "classId");

    if (classId === undefined) {
      throw new AppError(
        "classId is required when assignAllInClass is true",
        400,
      );
    }

    const students = await Student.findAll({
      where: { classId },
      attributes: ["id"],
    });

    const studentIds = students
      .map((student: any) => Number(student.id))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (studentIds.length === 0) {
      throw new AppError("No students found in this class", 404);
    }

    return studentIds;
  }

  return normalizeStudentIds(body.studentIds ?? body.studentId);
};

const getStudentProfileByUserId = async (userId: number) =>
  Student.findOne({ where: { userId } });

const getParentLinkedStudentIds = async (userId: number) => {
  const parent: any = await Parent.findOne({
    where: { userId },
    include: [
      {
        model: Student,
        attributes: ["id"],
        through: { attributes: [] },
      },
    ],
  });

  if (!parent) {
    return [] as number[];
  }

  const students = Array.isArray(parent.Students)
    ? parent.Students
    : Array.isArray(parent.students)
      ? parent.students
      : [];

  return students
    .map((student: any) => Number(student.id ?? student.get?.("id")))
    .filter((id: number) => Number.isInteger(id) && id > 0);
};

const getAccessibleStudent = async (req: Request) => {
  const currentUser = getCurrentUser(req);

  if (isManagerRole(currentUser.role)) {
    return {
      currentUser,
      student: null as any,
      linkedStudentIds: [] as number[],
    };
  }

  if (currentUser.role === "parent") {
    const linkedStudentIds = await getParentLinkedStudentIds(currentUser.id);

    if (!linkedStudentIds.length) {
      throw new AppError("No linked students found for this parent", 404);
    }

    return {
      currentUser,
      student: null as any,
      linkedStudentIds,
    };
  }

  const student: any = await getStudentProfileByUserId(currentUser.id);

  if (!student) {
    throw new AppError("Student profile not found", 404);
  }

  return {
    currentUser,
    student,
    linkedStudentIds: [Number(student.id)],
  };
};

const ensureMockTestAccess = async (req: Request, mockTest: any) => {
  const { currentUser, linkedStudentIds } = await getAccessibleStudent(req);

  if (isManagerRole(currentUser.role)) {
    return { currentUser, student: null as any };
  }

  const mockStudentId = Number(mockTest.studentId);

  if (
    !Number.isInteger(mockStudentId) ||
    mockStudentId <= 0 ||
    !linkedStudentIds.includes(mockStudentId)
  ) {
    throw new AppError("Access denied", 403);
  }

  return { currentUser, student: null as any };
};

const resolveRequestedStudentId = (
  requestedStudentId: number | undefined,
  linkedStudentIds: number[],
  role: UserRole,
) => {
  if (isManagerRole(role)) {
    return requestedStudentId;
  }

  if (role === "parent") {
    if (requestedStudentId !== undefined) {
      if (!linkedStudentIds.includes(requestedStudentId)) {
        throw new AppError("Access denied for this student", 403);
      }
      return requestedStudentId;
    }

    return linkedStudentIds[0];
  }

  return linkedStudentIds[0];
};

const normalizeSubmittedAnswers = (
  submittedAnswers: unknown,
  totalQuestions: number,
) => {
  const answers = new Map<number, string>();

  if (Array.isArray(submittedAnswers)) {
    submittedAnswers.forEach((item, index) => {
      if (typeof item === "string") {
        const answer = item.trim();
        if (answer) answers.set(index, answer);
        return;
      }

      if (!isObject(item)) return;

      const questionIndex = Number(
        item.questionIndex ?? item.index ?? item.question ?? index,
      );
      const selectedAnswer = toOptionalString(
        item.selectedAnswer ?? item.answer ?? item.option,
      );

      if (
        Number.isInteger(questionIndex) &&
        questionIndex >= 0 &&
        questionIndex < totalQuestions &&
        selectedAnswer
      ) {
        answers.set(questionIndex, selectedAnswer);
      }
    });

    return answers;
  }

  if (!isObject(submittedAnswers)) {
    return answers;
  }

  Object.entries(submittedAnswers).forEach(([key, value]) => {
    const questionIndex = Number(key);
    const selectedAnswer = toOptionalString(
      isObject(value)
        ? (value.selectedAnswer ?? value.answer ?? value.option)
        : value,
    );

    if (
      Number.isInteger(questionIndex) &&
      questionIndex >= 0 &&
      questionIndex < totalQuestions &&
      selectedAnswer
    ) {
      answers.set(questionIndex, selectedAnswer);
    }
  });

  return answers;
};

const extractMetrics = (mockTest: any): MockTestMetrics => {
  const questions = Array.isArray(mockTest?.questions)
    ? mockTest.questions
    : [];
  const result = isObject(mockTest?.result) ? mockTest.result : {};
  const score = Number(result.score);
  const totalQuestions = Number(result.totalQuestions);
  const correctCount = Number(result.correctCount);
  const wrongCount = Number(result.wrongCount);
  const unansweredCount = Number(result.unansweredCount);
  const percentage = Number(result.percentage);

  const resolvedTotalQuestions = Number.isFinite(totalQuestions)
    ? totalQuestions
    : questions.length;
  const resolvedCorrectCount = Number.isFinite(correctCount)
    ? correctCount
    : Number.isFinite(score)
      ? score
      : 0;
  const resolvedWrongCount = Number.isFinite(wrongCount)
    ? wrongCount
    : Math.max(resolvedTotalQuestions - resolvedCorrectCount, 0);
  const resolvedUnansweredCount = Number.isFinite(unansweredCount)
    ? unansweredCount
    : 0;
  const resolvedScore = Number.isFinite(score) ? score : null;
  const resolvedPercentage = Number.isFinite(percentage)
    ? percentage
    : resolvedScore !== null && resolvedTotalQuestions > 0
      ? roundToTwo((resolvedScore / resolvedTotalQuestions) * 100)
      : null;

  return {
    score: resolvedScore,
    totalQuestions: resolvedTotalQuestions,
    correctCount: resolvedCorrectCount,
    wrongCount: resolvedWrongCount,
    unansweredCount: resolvedUnansweredCount,
    percentage: resolvedPercentage,
  };
};

const getSubmittedAt = (mockTest: any) => {
  const submittedAt = isObject(mockTest?.result)
    ? mockTest.result.submittedAt
    : null;

  return typeof submittedAt === "string" ? submittedAt : null;
};

const extractTiming = (mockTest: any): MockTestTiming => {
  const result = isObject(mockTest?.result) ? mockTest.result : {};
  const startTime =
    typeof result.startTime === "string" ? result.startTime : null;
  const endTime = typeof result.endTime === "string" ? result.endTime : null;
  const rawTimeTakenSeconds = Number(result.timeTakenSeconds);
  const timeTakenSeconds = Number.isFinite(rawTimeTakenSeconds)
    ? rawTimeTakenSeconds
    : startTime && endTime
      ? Math.max(
          0,
          Math.round(
            (new Date(endTime).getTime() - new Date(startTime).getTime()) /
              1000,
          ),
        )
      : null;

  return {
    startTime,
    endTime,
    timeTakenSeconds,
    timeTakenMinutes:
      timeTakenSeconds === null ? null : roundToTwo(timeTakenSeconds / 60),
  };
};

const buildPerformanceSuggestion = (
  subjectName: string,
  metrics: MockTestMetrics,
) => {
  if (!metrics.totalQuestions) {
    return `Complete the ${subjectName} mock test to start tracking progress.`;
  }

  if ((metrics.percentage ?? 0) >= 80) {
    return `Strong ${subjectName} performance (${metrics.percentage}%). Keep revising the few missed concepts (${metrics.wrongCount} wrong, ${metrics.unansweredCount} unanswered) and maintain speed with timed practice.`;
  }

  if ((metrics.percentage ?? 0) >= 50) {
    return `Decent ${subjectName} progress (${metrics.percentage}%). Review the ${metrics.wrongCount} incorrect answers, focus on repeated mistakes, and retake a similar difficulty test this week.`;
  }

  return `More practice is needed in ${subjectName} (${metrics.percentage}%). Revisit the basics, study each explanation carefully, and attempt an easier mock test before moving up.`;
};

const buildRoleAnalyticsInsight = (
  role: UserRole | string,
  summary: {
    totalTestsTaken: number;
    averagePercentage: number;
    highestPercentage: number;
    latestPercentage: number;
  },
  strengths: string[],
  weaknesses: string[],
  trend: "improving" | "declining" | "stable" | "insufficient_data",
) => {
  const avg = summary.averagePercentage;
  const strengthText = strengths.length
    ? strengths.join(", ")
    : "no clear strengths yet";
  const weaknessText = weaknesses.length
    ? weaknesses.join(", ")
    : "no major weak subjects yet";
  const trendText =
    trend === "improving"
      ? "scores are improving"
      : trend === "declining"
        ? "scores are declining"
        : trend === "stable"
          ? "scores are stable"
          : "more attempts are needed to judge the trend";

  if (summary.totalTestsTaken === 0) {
    if (role === "parent") {
      return "No mock tests have been completed yet for this student. Encourage them to attempt assigned practice tests.";
    }
    if (role === "student") {
      return "You have not completed any mock tests yet. Start with an assigned practice test to unlock personalized suggestions.";
    }
    return "This student has not completed any mock tests yet. Assign a practice test and review results after submission.";
  }

  if (role === "parent") {
    return `Your child has completed ${summary.totalTestsTaken} mock test(s) with an average of ${avg}%. Strong areas: ${strengthText}. Needs attention: ${weaknessText}. Overall, ${trendText}.`;
  }

  if (role === "student") {
    return `You have completed ${summary.totalTestsTaken} mock test(s) with an average of ${avg}%. Keep building on ${strengthText}, and revise ${weaknessText}. Your trend: ${trendText}.`;
  }

  if (role === "teacher" || role === "head_teacher") {
    return `Student average is ${avg}% across ${summary.totalTestsTaken} mock test(s). Prioritize remediation in ${weaknessText}, while maintaining momentum in ${strengthText}. Trend: ${trendText}.`;
  }

  return `School/student mock average is ${avg}% across ${summary.totalTestsTaken} attempt(s). Focus teaching support on ${weaknessText}; celebrate progress in ${strengthText}. Trend: ${trendText}.`;
};

const buildRecommendedActions = (
  weaknesses: string[],
  averagePercentage: number,
  trend: "improving" | "declining" | "stable" | "insufficient_data",
) => {
  const actions: string[] = [];

  if (weaknesses.length) {
    actions.push(
      `Schedule focused revision sessions for: ${weaknesses.join(", ")}.`,
    );
  }

  if (averagePercentage < 50) {
    actions.push(
      "Assign an easier mock test first, then increase difficulty after the student crosses 60%.",
    );
  } else if (averagePercentage < 80) {
    actions.push(
      "Assign a similar-level practice test this week and review every incorrect explanation together.",
    );
  } else {
    actions.push(
      "Assign a harder timed mock test to stretch accuracy under exam pressure.",
    );
  }

  if (trend === "declining") {
    actions.push(
      "Compare the last two attempts question-by-question and rebuild weak concepts before the next test.",
    );
  }

  if (!actions.length) {
    actions.push("Keep a steady weekly mock-test practice routine.");
  }

  return actions;
};

const buildGenerationSuggestion = (
  subjectName: string,
  level: string,
  chapterName?: string | null,
) =>
  `Attempt this ${level} ${subjectName}${
    chapterName ? ` (${chapterName})` : ""
  } mock test carefully, review each explanation after submission, and use the missed questions to plan your next revision.`;

const optionLabels = ["A", "B", "C", "D"] as const;

const getQuestionOptions = (options: unknown): MockOption[] => {
  if (!Array.isArray(options)) {
    return [];
  }

  return options
    .map((option, index) => {
      if (typeof option === "string") {
        const label =
          optionLabels[index] || String.fromCharCode(65 + index);
        return { key: label, text: option };
      }

      if (!isObject(option)) {
        return null;
      }

      const keyCandidate =
        typeof option.key === "string"
          ? option.key
          : typeof (option as { label?: unknown }).label === "string"
            ? (option as { label: string }).label
            : optionLabels[index] || String.fromCharCode(65 + index);
      const textCandidate =
        typeof option.text === "string"
          ? option.text
          : typeof (option as { value?: unknown }).value === "string"
            ? (option as { value: string }).value
            : "";

      if (!textCandidate.trim()) {
        return null;
      }

      return {
        key: keyCandidate.trim(),
        text: textCandidate,
      };
    })
    .filter((option): option is MockOption => option !== null);
};

const buildOptionMap = (options: unknown) => {
  return getQuestionOptions(options).reduce<Record<string, string>>(
    (result, option, index) => {
      const label =
        option.key || optionLabels[index] || String.fromCharCode(65 + index);
      result[label] = option.text;
      return result;
    },
    {},
  );
};

const buildLabeledOptions = (options: unknown) =>
  getQuestionOptions(options).map((option, index) => ({
    label: option.key || optionLabels[index] || String.fromCharCode(65 + index),
    text: option.text,
  }));

const findOptionByKey = (options: unknown, key: string) =>
  getQuestionOptions(options).find(
    (option) => option.key.toLowerCase() === key.toLowerCase(),
  );

const findOptionByText = (options: unknown, text: string) =>
  getQuestionOptions(options).find((option) => option.text === text);

const findOptionLabel = (options: unknown, answer: unknown) => {
  if (typeof answer !== "string") {
    return null;
  }

  const optionByKey = findOptionByKey(options, answer);
  if (optionByKey) {
    return optionByKey.key;
  }

  return findOptionByText(options, answer)?.key ?? null;
};

const resolveSubmittedAnswer = (
  options: MockOption[],
  answer: string | null,
) => {
  if (!answer) {
    return null;
  }

  const normalizedAnswer = answer.trim();

  if (!normalizedAnswer) {
    return null;
  }

  const optionByKey = options.find(
    (option) => option.key.toLowerCase() === normalizedAnswer.toLowerCase(),
  );

  if (optionByKey) {
    return optionByKey.key;
  }

  return (
    options.find((option) => option.text === normalizedAnswer)?.key ??
    normalizedAnswer
  );
};

const findOptionText = (options: unknown, answer: unknown) => {
  if (typeof answer !== "string") {
    return null;
  }

  const optionByKey = findOptionByKey(options, answer);
  if (optionByKey) {
    return optionByKey.text;
  }

  return findOptionByText(options, answer)?.text ?? null;
};

const serializeQuestions = (questions: unknown, includeAnswers: boolean) => {
  if (!Array.isArray(questions)) {
    return [];
  }

  return questions.map((question, index) => {
    const item = isObject(question) ? question : {};

    return {
      index,
      question: item.question ?? "",
      options: getQuestionOptions(item.options),
      ...(includeAnswers
        ? {
            correctAnswer: item.correctAnswer ?? null,
            correctAnswerLabel: findOptionLabel(
              item.options,
              item.correctAnswer,
            ),
            explanation: item.explanation ?? null,
          }
        : {}),
    };
  });
};

const serializeMockTestUser = (user: any) => {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
};

const serializeAssignedStudent = (mockTest: any) => {
  const student =
    mockTest?.student ?? mockTest?.get?.("student") ?? null;

  if (!student) {
    return mockTest?.studentId
      ? {
          id: Number(mockTest.studentId),
          userId: null,
          rollNumber: null,
          name: null,
          email: null,
          role: "student",
        }
      : null;
  }

  const user = student.User ?? student.user ?? student.get?.("User") ?? null;

  return {
    id: Number(student.id),
    userId: student.userId ? Number(student.userId) : user?.id ?? null,
    rollNumber: student.rollNumber ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
    role: user?.role ?? "student",
  };
};

const getIncludedUser = (mockTest: any, alias: string) =>
  mockTest?.[alias] ?? mockTest?.get?.(alias) ?? null;

const serializeOwnership = (mockTest: any, currentUser?: CurrentUser) => {
  const generatedByUser = getIncludedUser(mockTest, "generatedByUser");
  const assignedByUser = getIncludedUser(mockTest, "assignedByUser");
  const generatedByUserId = mockTest.generatedByUserId ?? null;
  const assignedByUserId = mockTest.assignedByUserId ?? null;

  return {
    generatedByUserId,
    assignedByUserId,
    generatedBy: serializeMockTestUser(generatedByUser),
    assignedBy: serializeMockTestUser(assignedByUser),
    assignedStudent: serializeAssignedStudent(mockTest),
    generatedByMe:
      !!currentUser && Number(generatedByUserId) === Number(currentUser.id),
    assignedByMe:
      !!currentUser && Number(assignedByUserId) === Number(currentUser.id),
    assignedByTeacher: assignedByUserId != null,
  };
};

const serializeMockTestSummary = (
  mockTest: any,
  currentUser?: CurrentUser,
) => {
  const metrics = extractMetrics(mockTest);
  const submittedAt = getSubmittedAt(mockTest);
  const timing = extractTiming(mockTest);

  return {
    id: mockTest.id,
    studentId: mockTest.studentId,
    classId: mockTest.classId,
    className: mockTest.className,
    subjectId: mockTest.subjectId,
    subjectName: mockTest.subjectName,
    chapterId: mockTest.chapterId ?? null,
    chapterName: mockTest.chapterName ?? null,
    title: mockTest.title,
    level: mockTest.level,
    status: mockTest.status,
    assignmentBatchId: mockTest.assignmentBatchId ?? null,
    questionCount: Array.isArray(mockTest.questions)
      ? mockTest.questions.length
      : 0,
    score: metrics.score,
    totalQuestions: metrics.totalQuestions,
    correctCount: metrics.correctCount,
    wrongCount: metrics.wrongCount,
    unansweredCount: metrics.unansweredCount,
    percentage: metrics.percentage,
    submittedAt,
    startTime: timing.startTime,
    endTime: timing.endTime,
    timeTakenSeconds: timing.timeTakenSeconds,
    timeTakenMinutes: timing.timeTakenMinutes,
    ...serializeAttemptTiming(mockTest),
    ...serializeNegativeMarkingSnapshot(mockTest),
    ...serializeOwnership(mockTest, currentUser),
    createdAt: mockTest.createdAt,
    updatedAt: mockTest.updatedAt,
  };
};

const serializeMockTestDetail = (
  mockTest: any,
  includeAnswers: boolean,
  currentUser?: CurrentUser,
) => {
  const metrics = extractMetrics(mockTest);
  const submittedAt = getSubmittedAt(mockTest);
  const timing = extractTiming(mockTest);
  const attempt = serializeAttemptTiming(mockTest);
  const canExposeDraftAnswers =
    Boolean(currentUser) &&
    (isManagerRole(currentUser!.role) ||
      mockTest.status === "generated");

  return {
    id: mockTest.id,
    studentId: mockTest.studentId,
    classId: mockTest.classId,
    className: mockTest.className,
    subjectId: mockTest.subjectId,
    subjectName: mockTest.subjectName,
    chapterId: mockTest.chapterId ?? null,
    chapterName: mockTest.chapterName ?? null,
    title: mockTest.title,
    level: mockTest.level,
    status: mockTest.status,
    assignmentBatchId: mockTest.assignmentBatchId ?? null,
    questions: serializeQuestions(mockTest.questions, includeAnswers),
    submittedAnswers: mockTest.submittedAnswers ?? null,
    result: mockTest.result ?? null,
    aiSuggestion: includeAnswers ? (mockTest.aiSuggestion ?? null) : null,
    score: metrics.score,
    totalQuestions: metrics.totalQuestions,
    correctCount: metrics.correctCount,
    wrongCount: metrics.wrongCount,
    unansweredCount: metrics.unansweredCount,
    percentage: metrics.percentage,
    submittedAt,
    startTime: timing.startTime ?? attempt.attemptStartedAt,
    endTime: timing.endTime ?? attempt.attemptEndsAt,
    timeTakenSeconds: timing.timeTakenSeconds,
    timeTakenMinutes: timing.timeTakenMinutes,
    ...attempt,
    draftAnswers: canExposeDraftAnswers ? attempt.draftAnswers : null,
    questionStatuses: canExposeDraftAnswers ? attempt.questionStatuses : null,
    ...serializeNegativeMarkingSnapshot(mockTest),
    ...serializeOwnership(mockTest, currentUser),
    createdAt: mockTest.createdAt,
    updatedAt: mockTest.updatedAt,
  };
};

const resolveDurationSecondsForCreate = (body: Record<string, unknown>) => {
  try {
    return (
      parseDurationSecondsFromBody(body, {
        required: false,
        fallback: DEFAULT_MOCK_TEST_DURATION_SECONDS,
      }) ?? DEFAULT_MOCK_TEST_DURATION_SECONDS
    );
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Invalid duration",
      400,
    );
  }
};

const finalizeMockTestSubmission = async (
  mockTest: any,
  options: {
    submittedAnswers?: unknown;
    startTime?: unknown;
    endTime?: unknown;
    submissionReason?: unknown;
    currentUser: CurrentUser;
  },
) => {
  if (mockTest.status === "submitted" || mockTest.status === "evaluated") {
    return {
      alreadySubmitted: true as const,
      mockTest,
    };
  }

  const now = new Date();
  const reason = parseSubmissionReason(options.submissionReason);
  const answersSource =
    options.submittedAnswers !== undefined && options.submittedAnswers !== null
      ? options.submittedAnswers
      : (mockTest.draftAnswers ?? mockTest.submittedAnswers ?? []);

  const resolvedStartTime =
    toIsoOrNull(options.startTime) ??
    toIsoOrNull(mockTest.attemptStartedAt) ??
    (mockTest.createdAt instanceof Date
      ? mockTest.createdAt.toISOString()
      : new Date(mockTest.createdAt).toISOString());

  let resolvedEndTime = toIsoOrNull(options.endTime) ?? now.toISOString();
  const attemptEndsAt = toIsoOrNull(mockTest.attemptEndsAt);

  if (
    reason === "TIME_EXPIRED" &&
    attemptEndsAt &&
    new Date(resolvedEndTime).getTime() > new Date(attemptEndsAt).getTime()
  ) {
    resolvedEndTime = attemptEndsAt;
  }

  if (
    attemptEndsAt &&
    reason !== "TIME_EXPIRED" &&
    reason !== "EXAM_EXIT" &&
    hasAttemptExpired(attemptEndsAt, now)
  ) {
    // Server clock is authoritative: late manual submits become time-expired.
    resolvedEndTime = attemptEndsAt;
  }

  const evaluatedSubmission = buildMockTestResult(mockTest, answersSource, {
    startTime: resolvedStartTime,
    endTime: resolvedEndTime,
  });

  const questionCount = Array.isArray(mockTest.questions)
    ? mockTest.questions.length
    : 0;
  const answerMap = new Map<number, string | null>();
  evaluatedSubmission.submittedAnswers.forEach(
    (answer: string | null, index: number) => {
      answerMap.set(index, answer);
    },
  );

  await mockTest.update({
    submittedAnswers: evaluatedSubmission.submittedAnswers,
    result: {
      ...evaluatedSubmission.result,
      submissionReason:
        attemptEndsAt && hasAttemptExpired(attemptEndsAt, now) && reason === "MANUAL_SUBMIT"
          ? "TIME_EXPIRED"
          : reason,
    },
    aiSuggestion: evaluatedSubmission.aiSuggestion,
    status: "submitted",
    submissionReason:
      attemptEndsAt && hasAttemptExpired(attemptEndsAt, now) && reason === "MANUAL_SUBMIT"
        ? "TIME_EXPIRED"
        : reason,
    questionStatuses: deriveQuestionStatuses({
      questionCount,
      answers: answerMap,
      statuses: mockTest.questionStatuses,
    }),
    draftAnswers: evaluatedSubmission.submittedAnswers,
  });

  await mockTest.reload({ include: mockTestUserInclude });

  return {
    alreadySubmitted: false as const,
    mockTest,
  };
};

const buildMockTestResult = (
  mockTest: any,
  submittedAnswers: unknown,
  timingInput: { startTime?: unknown; endTime?: unknown },
) => {
  const questions = Array.isArray(mockTest.questions)
    ? (mockTest.questions as MockQuestion[])
    : [];

  if (questions.length === 0) {
    throw new AppError("Mock test has no questions to submit", 400);
  }

  const answers = normalizeSubmittedAnswers(submittedAnswers, questions.length);
  const answerList = questions.map((question, index) =>
    resolveSubmittedAnswer(question.options, answers.get(index) ?? null),
  );

  const questionResults = questions.map((question, index) => {
    const selectedAnswer = resolveSubmittedAnswer(
      question.options,
      answers.get(index) ?? null,
    );
    const isCorrect = selectedAnswer === question.correctAnswer;

    return {
      index,
      question: question.question,
      options: getQuestionOptions(question.options),
      selectedAnswer,
      selectedAnswerLabel: findOptionLabel(question.options, selectedAnswer),
      selectedAnswerText: findOptionText(question.options, selectedAnswer),
      correctAnswer: question.correctAnswer,
      correctAnswerLabel: findOptionLabel(
        question.options,
        question.correctAnswer,
      ),
      correctAnswerText: findOptionText(
        question.options,
        question.correctAnswer,
      ),
      explanation: question.explanation,
      isCorrect,
    };
  });

  const correctCount = questionResults.filter((item) => item.isCorrect).length;
  const unansweredCount = questionResults.filter(
    (item) => !item.selectedAnswer,
  ).length;
  const wrongCount = questionResults.length - correctCount - unansweredCount;
  const totalQuestions = questionResults.length;
  const marking = serializeNegativeMarkingSnapshot(mockTest);
  const scored = computeMockTestScore({
    correctCount,
    wrongCount,
    totalQuestions,
    negativeMarkingEnabled: marking.negativeMarkingEnabled,
    negativeMarkingPenalty: marking.negativeMarkingPenalty,
  });
  const score = scored.score;
  const percentage = scored.percentage;
  const resolvedStartTime =
    toIsoDateString(timingInput.startTime, "startTime") ??
    (mockTest.createdAt instanceof Date
      ? mockTest.createdAt.toISOString()
      : new Date(mockTest.createdAt).toISOString());
  const resolvedEndTime =
    toIsoDateString(timingInput.endTime, "endTime") ?? new Date().toISOString();
  const timeTakenSeconds = Math.max(
    0,
    Math.round(
      (new Date(resolvedEndTime).getTime() -
        new Date(resolvedStartTime).getTime()) /
        1000,
    ),
  );

  const result = {
    score,
    totalQuestions,
    maxScore: scored.maxScore,
    correctCount,
    wrongCount,
    unansweredCount,
    percentage,
    negativeMarkingEnabled: marking.negativeMarkingEnabled,
    negativeMarkingPenalty: marking.negativeMarkingPenalty,
    marksPerCorrect: scored.marksPerCorrect,
    questions: questionResults,
    submittedAt: resolvedEndTime,
    startTime: resolvedStartTime,
    endTime: resolvedEndTime,
    timeTakenSeconds,
    timeTakenMinutes: roundToTwo(timeTakenSeconds / 60),
  };

  return {
    submittedAnswers: answerList,
    result,
    aiSuggestion: buildPerformanceSuggestion(
      mockTest.subjectName ?? "this subject",
      {
        score,
        totalQuestions,
        correctCount,
        wrongCount,
        unansweredCount,
        percentage,
      },
    ),
  };
};

const resolveClassSubjectAndChapter = async (
  body: Record<string, unknown>,
  targetStudent: any,
) => {
  const requestedClassId = toOptionalPositiveInteger(body.classId, "classId");
  const requestedSubjectId = toOptionalPositiveInteger(
    body.subjectId,
    "subjectId",
  );
  const requestedChapterId = toOptionalPositiveInteger(
    body.chapterId,
    "chapterId",
  );
  const requestedChapterName = toOptionalString(body.chapterName);

  const selectedSubject: any = requestedSubjectId
    ? await Subject.findByPk(String(requestedSubjectId))
    : null;

  if (requestedSubjectId && !selectedSubject) {
    throw new AppError("Subject not found", 400);
  }

  let selectedChapter: any = requestedChapterId
    ? await Chapter.findByPk(String(requestedChapterId))
    : null;

  if (requestedChapterId && !selectedChapter) {
    throw new AppError("Chapter not found", 400);
  }

  // Allow chapterName-only payloads (web/mobile manual chapter text).
  if (!selectedChapter && requestedChapterName && selectedSubject) {
    selectedChapter = await Chapter.findOne({
      where: {
        subjectId: selectedSubject.id,
        name: requestedChapterName,
      },
    });

    if (!selectedChapter) {
      selectedChapter = await Chapter.findOne({
        where: {
          subjectId: selectedSubject.id,
          name: {
            [Op.like]: requestedChapterName,
          },
        },
      });
    }
  }

  if (
    selectedChapter &&
    selectedSubject &&
    Number(selectedChapter.subjectId) !== Number(selectedSubject.id)
  ) {
    throw new AppError("chapterId does not belong to subjectId", 400);
  }

  if (selectedChapter && !selectedSubject) {
    const chapterSubject: any = await Subject.findByPk(
      String(selectedChapter.subjectId),
    );
    if (!chapterSubject) {
      throw new AppError("Subject not found for chapter", 400);
    }
  }

  const resolvedSubject: any =
    selectedSubject ??
    (selectedChapter
      ? await Subject.findByPk(String(selectedChapter.subjectId))
      : null);

  const resolvedClassId =
    requestedClassId ?? targetStudent?.classId ?? resolvedSubject?.classId;

  const selectedClass: any = resolvedClassId
    ? await Class.findByPk(String(resolvedClassId))
    : null;

  if (resolvedClassId && !selectedClass) {
    throw new AppError("Class not found", 400);
  }

  if (
    resolvedSubject &&
    selectedClass &&
    Number(resolvedSubject.classId) !== Number(selectedClass.id)
  ) {
    throw new AppError("subjectId does not belong to classId", 400);
  }

  const resolvedClassName =
    selectedClass?.name ?? toOptionalString(body.className);
  const resolvedSubjectName =
    resolvedSubject?.name ?? toOptionalString(body.subjectName);
  const resolvedChapterName =
    selectedChapter?.name ?? requestedChapterName;

  if (!resolvedClassName || !resolvedSubjectName) {
    throw new AppError(
      "className and subjectName are required, or provide valid classId and subjectId",
      400,
    );
  }

  return {
    classId: selectedClass?.id ?? requestedClassId ?? null,
    className: resolvedClassName,
    subjectId: resolvedSubject?.id ?? requestedSubjectId ?? null,
    subjectName: resolvedSubjectName,
    chapterId: selectedChapter?.id ?? requestedChapterId ?? null,
    chapterName: resolvedChapterName ?? null,
  };
};

const buildProgressSummary = (
  mockTests: any[],
  role: UserRole | string = "student",
) => {
  const evaluatedTests = mockTests
    .map((mockTest) => ({ mockTest, metrics: extractMetrics(mockTest) }))
    .filter(
      ({ metrics }) => metrics.totalQuestions > 0 && metrics.score !== null,
    );

  if (evaluatedTests.length === 0) {
    return {
      summary: {
        totalTestsTaken: 0,
        averagePercentage: 0,
        highestPercentage: 0,
        latestPercentage: 0,
      },
      subjectPerformance: [],
      recentTests: [],
      analytics: {
        strengths: [] as string[],
        weaknesses: [] as string[],
        trend: "insufficient_data" as const,
        insight: buildRoleAnalyticsInsight(
          role,
          {
            totalTestsTaken: 0,
            averagePercentage: 0,
            highestPercentage: 0,
            latestPercentage: 0,
          },
          [],
          [],
          "insufficient_data",
        ),
        recommendedActions: [
          "Assign or attempt a mock test to unlock personalized AI analytics.",
        ],
      },
    };
  }

  const totalPercentage = evaluatedTests.reduce(
    (sum, item) => sum + (item.metrics.percentage ?? 0),
    0,
  );
  const highestPercentage = Math.max(
    ...evaluatedTests.map((item) => item.metrics.percentage ?? 0),
  );
  const latestPercentage = evaluatedTests[0]?.metrics.percentage ?? 0;

  const subjectMap = new Map<
    string,
    { subjectName: string; attempts: number; totalPercentage: number }
  >();

  evaluatedTests.forEach(({ mockTest, metrics }) => {
    const key = String(mockTest.subjectName ?? "Unknown Subject");
    const current = subjectMap.get(key) ?? {
      subjectName: key,
      attempts: 0,
      totalPercentage: 0,
    };

    current.attempts += 1;
    current.totalPercentage += metrics.percentage ?? 0;
    subjectMap.set(key, current);
  });

  const subjectPerformance = Array.from(subjectMap.values())
    .map((subject) => ({
      subjectName: subject.subjectName,
      attempts: subject.attempts,
      averagePercentage: roundToTwo(subject.totalPercentage / subject.attempts),
    }))
    .sort((left, right) => right.averagePercentage - left.averagePercentage);

  const strengths = subjectPerformance
    .filter((subject) => subject.averagePercentage >= 80)
    .map((subject) => subject.subjectName);
  const weaknesses = subjectPerformance
    .filter((subject) => subject.averagePercentage < 60)
    .map((subject) => subject.subjectName);

  const chronological = [...evaluatedTests].reverse();
  let trend: "improving" | "declining" | "stable" | "insufficient_data" =
    "insufficient_data";

  if (chronological.length >= 2) {
    const firstHalf = chronological.slice(
      0,
      Math.floor(chronological.length / 2),
    );
    const secondHalf = chronological.slice(Math.floor(chronological.length / 2));
    const firstAvg =
      firstHalf.reduce((sum, item) => sum + (item.metrics.percentage ?? 0), 0) /
      firstHalf.length;
    const secondAvg =
      secondHalf.reduce(
        (sum, item) => sum + (item.metrics.percentage ?? 0),
        0,
      ) / secondHalf.length;
    const delta = secondAvg - firstAvg;

    if (delta >= 5) trend = "improving";
    else if (delta <= -5) trend = "declining";
    else trend = "stable";
  }

  const summary = {
    totalTestsTaken: evaluatedTests.length,
    averagePercentage: roundToTwo(totalPercentage / evaluatedTests.length),
    highestPercentage: roundToTwo(highestPercentage),
    latestPercentage: roundToTwo(latestPercentage),
  };

  return {
    summary,
    subjectPerformance,
    recentTests: evaluatedTests.slice(0, 8).map(({ mockTest, metrics }) => ({
      id: mockTest.id,
      title: mockTest.title,
      subjectName: mockTest.subjectName,
      chapterName: mockTest.chapterName ?? null,
      level: mockTest.level,
      percentage: metrics.percentage,
      score: metrics.score,
      totalQuestions: metrics.totalQuestions,
      correctCount: metrics.correctCount,
      wrongCount: metrics.wrongCount,
      unansweredCount: metrics.unansweredCount,
      aiSuggestion: mockTest.aiSuggestion ?? null,
      submittedAt:
        (isObject(mockTest.result) &&
        typeof mockTest.result.submittedAt === "string"
          ? mockTest.result.submittedAt
          : null) ||
        mockTest.updatedAt,
      createdAt: mockTest.createdAt,
    })),
    analytics: {
      strengths,
      weaknesses,
      trend,
      insight: buildRoleAnalyticsInsight(
        role,
        summary,
        strengths,
        weaknesses,
        trend,
      ),
      recommendedActions: buildRecommendedActions(
        weaknesses,
        summary.averagePercentage,
        trend,
      ),
    },
  };
};

const createAssignmentBatchId = () => randomUUID().replace(/-/g, "");

const compareLeaderboardEntries = (left: any, right: any) => {
  const leftSubmitted = left.status === "submitted" || left.status === "evaluated";
  const rightSubmitted =
    right.status === "submitted" || right.status === "evaluated";

  if (leftSubmitted !== rightSubmitted) {
    return leftSubmitted ? -1 : 1;
  }

  if (!leftSubmitted && !rightSubmitted) {
    return String(left.studentName ?? "").localeCompare(
      String(right.studentName ?? ""),
    );
  }

  const percentageDiff = Number(right.percentage ?? 0) - Number(left.percentage ?? 0);
  if (percentageDiff !== 0) {
    return percentageDiff;
  }

  const scoreDiff = Number(right.score ?? 0) - Number(left.score ?? 0);
  if (scoreDiff !== 0) {
    return scoreDiff;
  }

  const leftTime =
    left.timeTakenSeconds == null ? Number.POSITIVE_INFINITY : Number(left.timeTakenSeconds);
  const rightTime =
    right.timeTakenSeconds == null
      ? Number.POSITIVE_INFINITY
      : Number(right.timeTakenSeconds);
  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  const leftSubmittedAt = left.submittedAt
    ? new Date(left.submittedAt).getTime()
    : Number.POSITIVE_INFINITY;
  const rightSubmittedAt = right.submittedAt
    ? new Date(right.submittedAt).getTime()
    : Number.POSITIVE_INFINITY;
  return leftSubmittedAt - rightSubmittedAt;
};

const resolveAssignmentPeerWhere = (mockTest: any) => {
  if (mockTest.assignmentBatchId) {
    return {
      assignmentBatchId: mockTest.assignmentBatchId,
      studentId: { [Op.not]: null },
    };
  }

  const where: Record<string, unknown> = {
    studentId: { [Op.not]: null },
    title: mockTest.title,
  };

  if (mockTest.schoolId != null) {
    where.schoolId = mockTest.schoolId;
  }
  if (mockTest.classId != null) {
    where.classId = mockTest.classId;
  }
  if (mockTest.subjectId != null) {
    where.subjectId = mockTest.subjectId;
  }
  if (mockTest.level != null) {
    where.level = mockTest.level;
  }
  if (mockTest.generatedByUserId != null) {
    where.generatedByUserId = mockTest.generatedByUserId;
  }

  return where;
};

const buildLeaderboardReport = (mockTests: any[], currentMockTestId?: number) => {
  const entries = mockTests.map((item) => {
    const metrics = extractMetrics(item);
    const timing = extractTiming(item);
    const student = serializeAssignedStudent(item);
    const isSubmitted =
      item.status === "submitted" || item.status === "evaluated";

    return {
      mockTestId: item.id,
      studentId: item.studentId,
      studentName: student?.name || "Student",
      rollNumber: student?.rollNumber || "",
      email: student?.email || "",
      status: item.status,
      isSubmitted,
      score: metrics.score,
      percentage: metrics.percentage,
      correctCount: metrics.correctCount,
      wrongCount: metrics.wrongCount,
      unansweredCount: metrics.unansweredCount,
      totalQuestions: metrics.totalQuestions,
      timeTakenSeconds: timing.timeTakenSeconds,
      timeTakenMinutes: timing.timeTakenMinutes,
      submittedAt: getSubmittedAt(item),
      submissionReason: item.submissionReason ?? item.result?.submissionReason ?? null,
      isCurrentStudent:
        currentMockTestId != null && Number(item.id) === Number(currentMockTestId),
    };
  });

  entries.sort(compareLeaderboardEntries);

  let nextRank = 1;
  const ranked = entries.map((entry, index) => {
    if (!entry.isSubmitted) {
      return { ...entry, rank: null as number | null };
    }

    if (index > 0) {
      const previous = entries[index - 1];
      const sameStanding =
        previous.isSubmitted &&
        Number(previous.percentage ?? 0) === Number(entry.percentage ?? 0) &&
        Number(previous.score ?? 0) === Number(entry.score ?? 0) &&
        Number(previous.timeTakenSeconds ?? -1) ===
          Number(entry.timeTakenSeconds ?? -1);

      if (!sameStanding) {
        nextRank = index + 1;
      }
    } else {
      nextRank = 1;
    }

    return { ...entry, rank: nextRank };
  });

  const submitted = ranked.filter((entry) => entry.isSubmitted);
  const pending = ranked.filter((entry) => !entry.isSubmitted);
  const currentEntry =
    ranked.find((entry) => entry.isCurrentStudent) ?? null;

  const averagePercentage =
    submitted.length > 0
      ? Math.round(
          (submitted.reduce(
            (sum, entry) => sum + Number(entry.percentage ?? 0),
            0,
          ) /
            submitted.length) *
            100,
        ) / 100
      : null;

  const highestPercentage =
    submitted.length > 0
      ? Math.max(...submitted.map((entry) => Number(entry.percentage ?? 0)))
      : null;

  return {
    entries: ranked,
    currentStudent: currentEntry,
    summary: {
      totalAssigned: ranked.length,
      totalSubmitted: submitted.length,
      totalPending: pending.length,
      averagePercentage,
      highestPercentage,
      completionRate:
        ranked.length > 0
          ? Math.round((submitted.length / ranked.length) * 10000) / 100
          : 0,
    },
  };
};

const parseMockTestJsonField = (raw: unknown): Record<string, unknown> => {
  if (isObject(raw)) {
    return raw as Record<string, unknown>;
  }

  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return isObject(parsed) ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  return {};
};

const normalizeMockTestQuestionsForPdf = (raw: unknown): any[] => {
  const unwrap = (value: unknown): any[] => {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      try {
        return unwrap(JSON.parse(value));
      } catch {
        return [];
      }
    }

    if (isObject(value) && Array.isArray(value.questions)) {
      return value.questions;
    }

    return [];
  };

  return unwrap(raw);
};

const toMockTestPdfRecord = (mockTest: any) => {
  if (mockTest && typeof mockTest.toJSON === "function") {
    return mockTest.toJSON();
  }
  return mockTest;
};

const buildMockTestPdf = async (mockTest: any, includeAnswers: boolean) => {
  await ensurePdfFontsInstalled();

  const record = toMockTestPdfRecord(mockTest);
  const pdfQuestions = normalizeMockTestQuestionsForPdf(record.questions);

  const scriptSamples: unknown[] = [
    record.title,
    record.className,
    record.subjectName,
    record.chapterName,
    record.aiSuggestion,
    ...pdfQuestions.flatMap(
      (question: any) => [
        question?.question,
        question?.explanation,
        question?.correctAnswer,
        ...(Array.isArray(question?.options)
          ? question.options.map((option: any) =>
              typeof option === "string" ? option : option?.text,
            )
          : []),
      ],
    ),
  ];
  const documentScript = detectPdfScriptFromValues(scriptSamples);
  if (pdfContentRequiresScript(documentScript, scriptSamples)) {
    await ensurePdfFontAvailable(documentScript);
  }

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    const resultPayload = parseMockTestJsonField(record.result);
    const resultQuestions = Array.isArray(resultPayload.questions)
      ? resultPayload.questions
      : [];
    const questions = pdfQuestions;

    const writeSpacing = (lines = 1) => {
      for (let index = 0; index < lines; index += 1) {
        doc.moveDown();
      }
    };

    const ensureSpace = (space = 80) => {
      if (doc.y > doc.page.height - space) {
        doc.addPage();
        applyPdfUnicodeFont(doc, { script: documentScript, size: 11 });
      }
    };

    const writeLine = (
      text: string,
      options?: {
        style?: "regular" | "bold";
        size?: number;
        align?: "left" | "center" | "right" | "justify";
        underline?: boolean;
      },
    ) => {
      writePdfTextMixed(doc, text, {
        documentScript,
        style: options?.style,
        size: options?.size ?? 11,
        align: options?.align,
        underline: options?.underline,
      });
    };

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    applyPdfUnicodeFont(doc, { script: documentScript, size: 11 });

    writeLine(String(record.title ?? "Mock Test"), {
      style: "bold",
      size: 18,
      align: "center",
    });
    writeSpacing();

    writeLine(`Class: ${record.className ?? "N/A"}`);
    writeLine(`Subject: ${record.subjectName ?? "N/A"}`);
    if (record.chapterName) {
      writeLine(`Chapter: ${record.chapterName}`);
    }
    writeLine(`Level: ${record.level ?? "N/A"}`);
    writeLine(`Status: ${record.status ?? "N/A"}`);

    const metrics = extractMetrics({
      ...record,
      questions: pdfQuestions,
      result: resultPayload,
    });
    if (includeAnswers && metrics.score !== null) {
      writeSpacing();
      writeLine("Performance Summary", {
        style: "bold",
        size: 12,
        underline: true,
      });
      writeLine(
        `Score: ${metrics.score}/${metrics.totalQuestions} (${metrics.percentage ?? 0}%)`,
      );
      if (Boolean(record.negativeMarkingEnabled)) {
        const marking = serializeNegativeMarkingSnapshot(record);
        writeLine(
          `Negative marking: -${marking.negativeMarkingPenalty} per wrong answer`,
        );
      }
      writeLine(
        `Correct: ${metrics.correctCount} | Wrong: ${metrics.wrongCount} | Unanswered: ${metrics.unansweredCount}`,
      );
      if (record.aiSuggestion) {
        writeSpacing();
        writeLine(`Suggestion: ${record.aiSuggestion}`);
      }
    }

    writeSpacing();
    writeLine("Questions", { style: "bold", size: 12, underline: true });
    writeSpacing();

    questions.forEach((question: any, index: number) => {
      ensureSpace(140);

      writeLine(
        `${index + 1}. ${String(question.question ?? question.text ?? "")}`,
        {
          style: "bold",
        },
      );
      const options = getQuestionOptions(question.options);
      options.forEach((option) => {
        writeLine(`${option.key}. ${option.text}`);
      });

      if (includeAnswers) {
        const resultQuestion = resultQuestions[index];
        const correctAnswerText = findOptionText(
          question.options,
          question.correctAnswer,
        );

        const correctAnswerValue = `${String(question.correctAnswer ?? "N/A")}${
          correctAnswerText ? `. ${correctAnswerText}` : ""
        }`;
        writePdfLabelValueLine(doc, "Correct Answer", correctAnswerValue, {
          documentScript,
          size: 11,
        });

        if (resultQuestion?.selectedAnswer) {
          const selectedAnswerText = findOptionText(
            question.options,
            resultQuestion.selectedAnswer,
          );
          const selectedAnswerValue = `${String(resultQuestion.selectedAnswer)}${
            selectedAnswerText ? `. ${selectedAnswerText}` : ""
          }`;

          writePdfLabelValueLine(doc, "Selected Answer", selectedAnswerValue, {
            documentScript,
            size: 11,
          });
          writeLine(
            `Result: ${resultQuestion.isCorrect ? "Correct" : "Incorrect"}`,
          );
        }

        if (question.explanation) {
          writePdfLabelValueLine(
            doc,
            "Explanation",
            String(question.explanation),
            { documentScript, size: 11 },
          );
        }
      }

      writeSpacing();
    });

    doc.end();
  });
};

export const getMockTests = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { currentUser, student, linkedStudentIds } =
      await getAccessibleStudent(req);
    const { page, limit, offset } = getPagination(req);
    const where: Record<PropertyKey, unknown> = {};
    const andConditions: Record<PropertyKey, unknown>[] = [];
    const queryStudentId = toOptionalPositiveInteger(
      req.query.studentId,
      "studentId",
    );
    const queryClassId = toOptionalPositiveInteger(
      req.query.classId,
      "classId",
    );
    const querySubjectId = toOptionalPositiveInteger(
      req.query.subjectId,
      "subjectId",
    );
    const status = toOptionalString(req.query.status);
    const onlyAssigned = toBoolean(req.query.onlyAssigned);
    const search = String(req.query.search ?? req.query.keyword ?? "").trim();
    const source = String(req.query.source ?? "")
      .trim()
      .toLowerCase();

    if (isManagerRole(currentUser.role)) {
      andConditions.push({
        [Op.or]: [
          { generatedByUserId: currentUser.id },
          { assignedByUserId: currentUser.id },
        ],
      });

      if (queryStudentId !== undefined) {
        where.studentId = queryStudentId;
      } else if (onlyAssigned) {
        where.studentId = { [Op.not]: null };
      }
    } else if (currentUser.role === "parent") {
      const resolvedStudentId = resolveRequestedStudentId(
        queryStudentId,
        linkedStudentIds,
        currentUser.role,
      );
      where.studentId =
        resolvedStudentId !== undefined
          ? resolvedStudentId
          : { [Op.in]: linkedStudentIds };
    } else {
      where.studentId = student.id;
    }

    // Students/parents: split teacher-assigned tests vs self practice.
    if (!isManagerRole(currentUser.role)) {
      if (source === "assigned") {
        andConditions.push({
          assignedByUserId: { [Op.ne]: null },
        });
      } else if (source === "self") {
        let selfPracticeGeneratorUserIds: number[] = [];
        if (currentUser.role === "parent") {
          const linkedStudents = linkedStudentIds.length
            ? await Student.findAll({
                where: { id: { [Op.in]: linkedStudentIds } },
                attributes: ["userId"],
              })
            : [];
          selfPracticeGeneratorUserIds = linkedStudents
            .map((row: any) => Number(row.userId ?? row.get?.("userId")))
            .filter((id) => Number.isInteger(id) && id > 0);
        } else {
          selfPracticeGeneratorUserIds = [Number(currentUser.id)];
        }

        andConditions.push({
          assignedByUserId: { [Op.is]: null },
          generatedByUserId: {
            [Op.in]: selfPracticeGeneratorUserIds.length
              ? selfPracticeGeneratorUserIds
              : [-1],
          },
        });
      }
    }

    if (queryClassId !== undefined) {
      where.classId = queryClassId;
    }

    if (querySubjectId !== undefined) {
      where.subjectId = querySubjectId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      const searchLike = `%${search}%`;
      andConditions.push({
        [Op.or]: [
          { title: { [Op.like]: searchLike } },
          { subjectName: { [Op.like]: searchLike } },
          { chapterName: { [Op.like]: searchLike } },
          { className: { [Op.like]: searchLike } },
          { level: { [Op.like]: searchLike } },
          { "$student.User.name$": { [Op.like]: searchLike } },
          { "$student.User.email$": { [Op.like]: searchLike } },
          { "$student.rollNumber$": { [Op.like]: searchLike } },
        ],
      });
    }

    if (andConditions.length > 0) {
      where[Op.and] = andConditions;
    }

    const { rows: mockTests, count } = await MockTest.findAndCountAll({
      where,
      include: mockTestUserInclude,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      distinct: true,
      subQuery: false,
    });

    res.json({
      mockTests: mockTests.map((mockTest) =>
        serializeMockTestSummary(mockTest, currentUser),
      ),
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};

export const createMockTest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const currentUser = getCurrentUser(req);

    if (!isManagerRole(currentUser.role)) {
      throw new AppError("Access denied", 403);
    }

    const { title, level, questions, studentId } = req.body ?? {};

    let targetStudent: any = null;
    const requestedStudentId = toOptionalPositiveInteger(
      studentId,
      "studentId",
    );

    if (requestedStudentId !== undefined) {
      targetStudent = await Student.findByPk(String(requestedStudentId));

      if (!targetStudent) {
        throw new AppError("Student not found", 404);
      }
    }

    const normalizedLevel = String(level ?? "").toLowerCase();
    if (
      !allowedLevels.includes(normalizedLevel as (typeof allowedLevels)[number])
    ) {
      throw new AppError(
        "level is required and must be one of: easy, medium, hard",
        400,
      );
    }

    let validatedQuestions: MockQuestion[];
    try {
      validatedQuestions = validateMockTestQuestions(questions);
    } catch (error) {
      throw new AppError(
        error instanceof Error ? error.message : "Invalid questions payload",
        400,
      );
    }

    if (validatedQuestions.length > 50) {
      throw new AppError("A mock test can include at most 50 questions", 400);
    }

    const resolvedContext = await resolveClassSubjectAndChapter(
      req.body ?? {},
      targetStudent,
    );

    const resolvedTitle =
      toOptionalString(title) ||
      `${resolvedContext.className} ${resolvedContext.subjectName} Mock Test`;

    const schoolId = Number(req.schoolId);
    const resolvedSchoolId =
      Number.isInteger(schoolId) && schoolId > 0 ? schoolId : null;
    const marking = await resolveNegativeMarkingSnapshotForCreate(
      resolvedSchoolId,
      (req.body ?? {}) as Record<string, unknown>,
    );
    const durationSeconds = resolveDurationSecondsForCreate(
      (req.body ?? {}) as Record<string, unknown>,
    );

    const mockTest = await MockTest.create({
      studentId: targetStudent?.id ?? null,
      generatedByUserId: currentUser.id,
      assignedByUserId:
        targetStudent && isManagerRole(currentUser.role)
          ? currentUser.id
          : null,
      schoolId: resolvedSchoolId,
      classId: resolvedContext.classId,
      className: String(resolvedContext.className),
      subjectId: resolvedContext.subjectId,
      subjectName: String(resolvedContext.subjectName),
      chapterId: resolvedContext.chapterId,
      chapterName: resolvedContext.chapterName,
      title: resolvedTitle,
      level: normalizedLevel,
      questions: validatedQuestions,
      durationSeconds,
      assignmentBatchId:
        targetStudent && isManagerRole(currentUser.role)
          ? createAssignmentBatchId()
          : null,
      aiSuggestion: buildGenerationSuggestion(
        String(resolvedContext.subjectName),
        normalizedLevel,
        resolvedContext.chapterName,
      ),
      status: "generated",
      ...marking,
    });

    res.status(201).json({
      message:
        targetStudent && isManagerRole(currentUser.role)
          ? "mock test created and assigned successfully"
          : "mock test created successfully",
      provider: "manual",
      mockTest: serializeMockTestDetail(mockTest, true, currentUser),
    });
  } catch (err) {
    next(err);
  }
};

export const generateMockTest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const currentUser = getCurrentUser(req);

    if (!(isManagerRole(currentUser.role) || currentUser.role === "student")) {
      throw new AppError("Access denied", 403);
    }

    const { studentId, level, questionCount, title } = req.body ?? {};

    let targetStudent: any = null;
    const requestedStudentId = toOptionalPositiveInteger(
      studentId,
      "studentId",
    );

    if (currentUser.role === "student") {
      targetStudent = await getStudentProfileByUserId(currentUser.id);

      if (!targetStudent) {
        throw new AppError("Student profile not found", 404);
      }

      if (
        requestedStudentId !== undefined &&
        Number(requestedStudentId) !== Number(targetStudent.id)
      ) {
        throw new AppError("Access denied", 403);
      }
    } else if (requestedStudentId !== undefined) {
      targetStudent = await Student.findByPk(String(requestedStudentId));

      if (!targetStudent) {
        throw new AppError("Student not found", 404);
      }
    }

    const normalizedLevel = String(level ?? "").toLowerCase();
    if (
      !allowedLevels.includes(normalizedLevel as (typeof allowedLevels)[number])
    ) {
      throw new AppError(
        "level is required and must be one of: easy, medium, hard",
        400,
      );
    }

    const resolvedContext = await resolveClassSubjectAndChapter(
      req.body ?? {},
      targetStudent,
    );

    const count = Math.min(toPositiveInteger(questionCount, 10), 50);
    const generated = await generateMockTestWithAi({
      className: String(resolvedContext.className),
      subjectName: String(resolvedContext.subjectName),
      chapterName: resolvedContext.chapterName,
      level: normalizedLevel as "easy" | "medium" | "hard",
      questionCount: count,
    });

    const resolvedTitle =
      toOptionalString(title) ||
      (typeof generated.title === "string" && generated.title.trim()
        ? generated.title.trim()
        : `${resolvedContext.className} ${resolvedContext.subjectName}${
            resolvedContext.chapterName
              ? ` ${resolvedContext.chapterName}`
              : ""
          } Mock Test`);

    const schoolId = Number(req.schoolId);
    const resolvedSchoolId =
      Number.isInteger(schoolId) && schoolId > 0 ? schoolId : null;
    const marking = await resolveNegativeMarkingSnapshotForCreate(
      resolvedSchoolId,
      (req.body ?? {}) as Record<string, unknown>,
    );
    const durationSeconds = resolveDurationSecondsForCreate(
      (req.body ?? {}) as Record<string, unknown>,
    );

    const mockTest = await MockTest.create({
      studentId: targetStudent?.id ?? null,
      generatedByUserId: currentUser.id,
      assignedByUserId:
        targetStudent && isManagerRole(currentUser.role) ? currentUser.id : null,
      schoolId: resolvedSchoolId,
      classId: resolvedContext.classId,
      className: String(resolvedContext.className),
      subjectId: resolvedContext.subjectId,
      subjectName: String(resolvedContext.subjectName),
      chapterId: resolvedContext.chapterId,
      chapterName: resolvedContext.chapterName,
      title: resolvedTitle,
      level: normalizedLevel,
      questions: generated.questions,
      durationSeconds,
      assignmentBatchId:
        targetStudent && isManagerRole(currentUser.role)
          ? createAssignmentBatchId()
          : null,
      aiSuggestion: buildGenerationSuggestion(
        String(resolvedContext.subjectName),
        normalizedLevel,
        resolvedContext.chapterName,
      ),
      status: "generated",
      ...marking,
    });

    const includeAnswers = true;

    res.status(201).json({
      message:
        targetStudent && isManagerRole(currentUser.role)
          ? "mock test generated and assigned successfully"
          : "mock test generated successfully",
      provider: generated.provider,
      model: generated.model,
      mockTest: serializeMockTestDetail(mockTest, includeAnswers, currentUser),
    });
  } catch (err) {
    next(err);
  }
};

export const getMockTestResult = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const mockTest: any = await MockTest.findByPk(String(req.params.id), {
      include: mockTestUserInclude,
    });

    if (!mockTest) {
      return res.status(404).json({ message: "mockTest not found" });
    }

    const { currentUser } = await ensureMockTestAccess(req, mockTest);
    const includeAnswers =
      isManagerRole(currentUser.role) || mockTest.status !== "generated";

    res.json({
      mockTest: serializeMockTestDetail(mockTest, includeAnswers, currentUser),
    });
  } catch (err) {
    next(err);
  }
};

export const getMockTestById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const mockTest: any = await MockTest.findByPk(String(req.params.id), {
      include: mockTestUserInclude,
    });

    if (!mockTest) {
      return res.status(404).json({ message: "mockTest not found" });
    }

    const { currentUser } = await ensureMockTestAccess(req, mockTest);

    if (
      mockTest.status === "generated" &&
      mockTest.attemptStartedAt &&
      hasAttemptExpired(mockTest.attemptEndsAt)
    ) {
      await finalizeMockTestSubmission(mockTest, {
        submissionReason: "TIME_EXPIRED",
        endTime: mockTest.attemptEndsAt,
        currentUser,
      });
    }

    const includeAnswers =
      isManagerRole(currentUser.role) || mockTest.status !== "generated";

    res.json({
      mockTest: serializeMockTestDetail(mockTest, includeAnswers, currentUser),
    });
  } catch (err) {
    next(err);
  }
};

export const submitMockTest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      mockTestId,
      submittedAnswers,
      startTime,
      endTime,
      submissionReason,
    } = req.body ?? {};

    if (!mockTestId) {
      throw new AppError("mockTestId is required", 400);
    }

    const mockTest: any = await MockTest.findByPk(mockTestId, {
      include: mockTestUserInclude,
    });
    if (!mockTest)
      return res.status(404).json({ message: "mockTest not found" });

    const { currentUser } = await ensureMockTestAccess(req, mockTest);

    const finalized = await finalizeMockTestSubmission(mockTest, {
      submittedAnswers,
      startTime,
      endTime,
      submissionReason,
      currentUser,
    });

    res.json({
      message: finalized.alreadySubmitted
        ? "mock test already submitted"
        : "mock test submitted successfully",
      mockTest: serializeMockTestDetail(finalized.mockTest, true, currentUser),
      submittedBy: currentUser.role,
      alreadySubmitted: finalized.alreadySubmitted,
    });
  } catch (err) {
    next(err);
  }
};

export const startMockTestAttempt = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const mockTest: any = await MockTest.findByPk(String(req.params.id), {
      include: mockTestUserInclude,
    });

    if (!mockTest) {
      return res.status(404).json({ message: "mockTest not found" });
    }

    const { currentUser } = await ensureMockTestAccess(req, mockTest);

    if (mockTest.status === "submitted" || mockTest.status === "evaluated") {
      return res.json({
        message: "mock test already submitted",
        mockTest: serializeMockTestDetail(mockTest, true, currentUser),
        alreadySubmitted: true,
      });
    }

    const now = new Date();

    if (mockTest.attemptStartedAt) {
      if (hasAttemptExpired(mockTest.attemptEndsAt, now)) {
        const finalized = await finalizeMockTestSubmission(mockTest, {
          submissionReason: "TIME_EXPIRED",
          endTime: mockTest.attemptEndsAt,
          currentUser,
        });

        return res.json({
          message: "mock test time expired and was submitted automatically",
          mockTest: serializeMockTestDetail(
            finalized.mockTest,
            true,
            currentUser,
          ),
          alreadySubmitted: true,
          autoSubmitted: true,
        });
      }

      return res.json({
        message: "mock test attempt already started",
        mockTest: serializeMockTestDetail(mockTest, false, currentUser),
        alreadyStarted: true,
      });
    }

    const durationSeconds =
      typeof mockTest.durationSeconds === "number" &&
      mockTest.durationSeconds > 0
        ? mockTest.durationSeconds
        : DEFAULT_MOCK_TEST_DURATION_SECONDS;
    const attemptEndsAt = computeAttemptEndsAt(now, durationSeconds);

    await mockTest.update({
      durationSeconds,
      attemptStartedAt: now,
      attemptEndsAt,
      draftAnswers: mockTest.draftAnswers ?? [],
      questionStatuses:
        mockTest.questionStatuses ??
        deriveQuestionStatuses({
          questionCount: Array.isArray(mockTest.questions)
            ? mockTest.questions.length
            : 0,
          answers: {},
        }),
    });

    await mockTest.reload({ include: mockTestUserInclude });

    res.json({
      message: "mock test attempt started",
      mockTest: serializeMockTestDetail(mockTest, false, currentUser),
      alreadyStarted: false,
    });
  } catch (err) {
    next(err);
  }
};

export const saveMockTestAnswers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const mockTest: any = await MockTest.findByPk(String(req.params.id), {
      include: mockTestUserInclude,
    });

    if (!mockTest) {
      return res.status(404).json({ message: "mockTest not found" });
    }

    const { currentUser } = await ensureMockTestAccess(req, mockTest);

    if (mockTest.status === "submitted" || mockTest.status === "evaluated") {
      throw new AppError("Mock test already submitted", 400);
    }

    if (!mockTest.attemptStartedAt) {
      throw new AppError("Mock test attempt has not been started", 400);
    }

    const now = new Date();
    if (hasAttemptExpired(mockTest.attemptEndsAt, now)) {
      const finalized = await finalizeMockTestSubmission(mockTest, {
        submittedAnswers: req.body?.submittedAnswers ?? mockTest.draftAnswers,
        submissionReason: "TIME_EXPIRED",
        endTime: mockTest.attemptEndsAt,
        currentUser,
      });

      return res.json({
        message: "mock test time expired and was submitted automatically",
        mockTest: serializeMockTestDetail(finalized.mockTest, true, currentUser),
        autoSubmitted: true,
      });
    }

    const questionCount = Array.isArray(mockTest.questions)
      ? mockTest.questions.length
      : 0;
    const answers = normalizeSubmittedAnswers(
      req.body?.submittedAnswers ?? [],
      questionCount,
    );
    const answerList = Array.from({ length: questionCount }, (_, index) =>
      answers.get(index) ?? null,
    );
    const questionStatuses = deriveQuestionStatuses({
      questionCount,
      answers,
      statuses: req.body?.questionStatuses ?? mockTest.questionStatuses,
    });

    // Allow explicit skipped markers from client.
    if (isObject(req.body?.questionStatuses)) {
      for (const [key, value] of Object.entries(req.body.questionStatuses)) {
        const normalized = String(value).toUpperCase();
        if (
          normalized === "SKIPPED" &&
          !answerList[Number(key)]
        ) {
          questionStatuses[key] = "SKIPPED";
        }
        if (
          normalized === "NOT_VISITED" &&
          !answerList[Number(key)] &&
          questionStatuses[key] !== "SKIPPED"
        ) {
          questionStatuses[key] = "NOT_VISITED";
        }
      }
    }

    await mockTest.update({
      draftAnswers: answerList,
      questionStatuses,
    });
    await mockTest.reload({ include: mockTestUserInclude });

    res.json({
      message: "answers saved",
      mockTest: serializeMockTestDetail(mockTest, false, currentUser),
    });
  } catch (err) {
    next(err);
  }
};

export const assignMockTest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const currentUser = getCurrentUser(req);

    if (!isManagerRole(currentUser.role)) {
      throw new AppError("Access denied", 403);
    }

    const mockTest: any = await MockTest.findByPk(String(req.params.id), {
      include: mockTestUserInclude,
    });

    if (!mockTest) {
      return res.status(404).json({ message: "mockTest not found" });
    }

    if (mockTest.status !== "generated") {
      throw new AppError("Only generated mock tests can be assigned", 400);
    }

    const studentIds = await resolveAssignmentStudentIds(
      (req.body ?? {}) as Record<string, unknown>,
      mockTest,
    );
    const students = await Student.findAll({
      where: { id: { [Op.in]: studentIds } },
    });
    const foundStudentIds = new Set(
      students.map((student: any) => Number(student.id)),
    );
    const missingStudentIds = studentIds.filter(
      (id) => !foundStudentIds.has(id),
    );

    if (missingStudentIds.length > 0) {
      throw new AppError(
        `Student not found: ${missingStudentIds.join(", ")}`,
        404,
      );
    }

    const marking = serializeNegativeMarkingSnapshot(mockTest);
    const assignmentBatchId =
      mockTest.assignmentBatchId || createAssignmentBatchId();
    const basePayload = {
      classId: mockTest.classId,
      className: mockTest.className,
      subjectId: mockTest.subjectId,
      subjectName: mockTest.subjectName,
      chapterId: mockTest.chapterId ?? null,
      chapterName: mockTest.chapterName ?? null,
      schoolId: mockTest.schoolId ?? null,
      title: mockTest.title,
      level: mockTest.level,
      questions: mockTest.questions,
      durationSeconds:
        mockTest.durationSeconds ?? DEFAULT_MOCK_TEST_DURATION_SECONDS,
      assignmentBatchId,
      aiSuggestion: mockTest.aiSuggestion,
      generatedByUserId: mockTest.generatedByUserId ?? currentUser.id,
      assignedByUserId: currentUser.id,
      status: "generated",
      ...marking,
    };

    const assignedMockTests: any[] = [];
    const firstStudentId = studentIds[0];

    if (mockTest.studentId === null || mockTest.studentId === undefined) {
      await mockTest.update({
        studentId: firstStudentId,
        assignedByUserId: currentUser.id,
        durationSeconds:
          mockTest.durationSeconds ?? DEFAULT_MOCK_TEST_DURATION_SECONDS,
        assignmentBatchId,
      });
      assignedMockTests.push(mockTest);
    } else if (!mockTest.assignmentBatchId) {
      await mockTest.update({ assignmentBatchId });
    }

    const remainingStudentIds =
      assignedMockTests[0]?.id === mockTest.id &&
      Number(assignedMockTests[0]?.studentId) === Number(firstStudentId)
        ? studentIds.slice(1)
        : studentIds;

    for (const studentId of remainingStudentIds) {
      const assignedMockTest = await MockTest.create({
        ...basePayload,
        studentId,
      });
      assignedMockTests.push(assignedMockTest);
    }

    res.status(200).json({
      message: "mock test assigned successfully",
      assignedCount: assignedMockTests.length,
      mockTests: assignedMockTests.map((assignedMockTest) =>
        serializeMockTestDetail(assignedMockTest, true, currentUser),
      ),
    });
  } catch (err) {
    next(err);
  }
};

export const getMockTestProgress = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { currentUser, student, linkedStudentIds } =
      await getAccessibleStudent(req);
    const where: Record<PropertyKey, unknown> = {};
    const queryStudentId = toOptionalPositiveInteger(
      req.query.studentId,
      "studentId",
    );

    if (isManagerRole(currentUser.role)) {
      if (queryStudentId !== undefined) {
        where.studentId = queryStudentId;
      } else {
        where[Op.or] = [
          { generatedByUserId: currentUser.id },
          { assignedByUserId: currentUser.id },
        ];
        where.studentId = { [Op.not]: null };
      }
    } else if (currentUser.role === "parent") {
      const resolvedStudentId = resolveRequestedStudentId(
        queryStudentId,
        linkedStudentIds,
        currentUser.role,
      );
      where.studentId =
        resolvedStudentId !== undefined
          ? resolvedStudentId
          : { [Op.in]: linkedStudentIds };
    } else {
      where.studentId = student.id;
    }

    const mockTests = await MockTest.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });

    res.json({
      progress: buildProgressSummary(mockTests, currentUser.role),
      studentId:
        typeof where.studentId === "number" ? where.studentId : queryStudentId ?? null,
    });
  } catch (err) {
    next(err);
  }
};

export const getMockTestLeaderboard = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const mockTest: any = await MockTest.findByPk(String(req.params.id), {
      include: mockTestUserInclude,
    });

    if (!mockTest) {
      return res.status(404).json({ message: "mockTest not found" });
    }

    const { currentUser } = await ensureMockTestAccess(req, mockTest);

    if (!mockTest.studentId && !isManagerRole(currentUser.role)) {
      throw new AppError("Leaderboard is available after assignment", 400);
    }

    const peers = await MockTest.findAll({
      where: resolveAssignmentPeerWhere(mockTest),
      include: mockTestUserInclude,
    });

    // Students only see standings after they have submitted (or if manager).
    if (
      !isManagerRole(currentUser.role) &&
      mockTest.status === "generated"
    ) {
      return res.json({
        mockTestId: mockTest.id,
        assignmentBatchId: mockTest.assignmentBatchId ?? null,
        title: mockTest.title,
        classId: mockTest.classId,
        className: mockTest.className,
        subjectName: mockTest.subjectName,
        locked: true,
        message: "Class standings unlock after you submit this mock test.",
        summary: {
          totalAssigned: peers.length,
          totalSubmitted: peers.filter(
            (item: any) =>
              item.status === "submitted" || item.status === "evaluated",
          ).length,
          totalPending: peers.filter(
            (item: any) =>
              item.status !== "submitted" && item.status !== "evaluated",
          ).length,
          averagePercentage: null,
          highestPercentage: null,
          completionRate: 0,
        },
        entries: [],
        currentStudent: null,
      });
    }

    const report = buildLeaderboardReport(peers, mockTest.id);

    res.json({
      mockTestId: mockTest.id,
      assignmentBatchId: mockTest.assignmentBatchId ?? null,
      title: mockTest.title,
      classId: mockTest.classId,
      className: mockTest.className,
      subjectName: mockTest.subjectName,
      locked: false,
      message: null,
      ...report,
    });
  } catch (err) {
    next(err);
  }
};

export const downloadMockTestPdf = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const mockTest: any = await MockTest.findByPk(String(req.params.id));

    if (!mockTest) {
      return res.status(404).json({ message: "mockTest not found" });
    }

    const { currentUser } = await ensureMockTestAccess(req, mockTest);

    // Students cannot download any paper before submission.
    if (
      !isManagerRole(currentUser.role) &&
      mockTest.status === "generated"
    ) {
      throw new AppError(
        "Exam paper download is available only after submission",
        403,
      );
    }

    const includeAnswersRequested = getIncludeAnswersParam(req.query);
    const includeAnswers =
      includeAnswersRequested &&
      (isManagerRole(currentUser.role) || mockTest.status !== "generated");

    if (includeAnswersRequested && !includeAnswers) {
      throw new AppError(
        "Answer key download is not available for this attempt",
        403,
      );
    }

    let pdf: Buffer;
    try {
      pdf = await buildMockTestPdf(mockTest, includeAnswers);
    } catch (pdfError) {
      const message =
        pdfError instanceof Error ? pdfError.message : "PDF generation failed";
      throw new AppError(
        message.includes("font")
          ? message
          : `Unable to generate mock test PDF. ${message}`,
        500,
      );
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="mock-test-${mockTest.id}${
        includeAnswers ? "-with-answers" : ""
      }.pdf"`,
    );

    res.send(pdf);
  } catch (err) {
    console.error("[mock-test-pdf] generation failed:", err);
    next(err);
  }
};

export const getMockTestAiSuggestion = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const mockTest: any = await MockTest.findByPk(String(req.params.id));
    if (!mockTest)
      return res.status(404).json({ message: "mockTest not found" });

    await ensureMockTestAccess(req, mockTest);

    res.json({ aiSuggestion: mockTest.aiSuggestion, result: mockTest.result });
  } catch (err) {
    next(err);
  }
};

export const getMockTestNegativeMarkingSettings = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const currentUser = getCurrentUser(req);
    const schoolId = getRequestSchoolId(req);
    const rule = await getSchoolNegativeMarkingRule(schoolId);
    const canManage =
      canManageNegativeMarking(currentUser.role) && rule.featureEnabled;

    res.json({
      schoolId,
      featureEnabled: rule.featureEnabled,
      enabled: rule.enabled,
      penalty: rule.penalty,
      marksPerCorrect: rule.marksPerCorrect,
      penaltyOptions: [...NEGATIVE_MARKING_PENALTY_OPTIONS],
      canManage,
      scoringRule:
        "+1 for each correct answer. Wrong answers deduct the penalty. Unanswered is 0. Score cannot go below 0.",
    });
  } catch (err) {
    next(err);
  }
};

export const updateMockTestNegativeMarkingSettings = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const currentUser = getCurrentUser(req);
    if (!canManageNegativeMarking(currentUser.role)) {
      throw new AppError(
        "Only Super Admin or School Owner can change negative marking",
        403,
      );
    }

    const schoolId = getRequestSchoolId(req);
    const rule = await updateSchoolNegativeMarkingRule(schoolId, {
      enabled: req.body?.enabled,
      penalty: req.body?.penalty,
    });

    res.json({
      message: rule.enabled
        ? "Negative marking is on for mock tests"
        : "Negative marking is off for mock tests",
      schoolId,
      featureEnabled: rule.featureEnabled,
      enabled: rule.enabled,
      penalty: rule.penalty,
      marksPerCorrect: rule.marksPerCorrect,
      penaltyOptions: [...NEGATIVE_MARKING_PENALTY_OPTIONS],
      canManage: true,
      scoringRule:
        "+1 for each correct answer. Wrong answers deduct the penalty. Unanswered is 0. Score cannot go below 0.",
    });
  } catch (err) {
    next(err);
  }
};
