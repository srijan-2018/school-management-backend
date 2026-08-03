import { NextFunction, Request, Response } from "express";
import PDFDocument from "pdfkit";
import { Op } from "sequelize";
import Chapter from "../models/chapter.model";
import Class from "../models/class.model";
import MockTest from "../models/mock-test.model";
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
  normalizeRole,
  type UserRole,
} from "../utils/roles";
import { buildPagination, getPagination } from "../utils/pagination";

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

const getStudentProfileByUserId = async (userId: number) =>
  Student.findOne({ where: { userId } });

const getAccessibleStudent = async (req: Request) => {
  const currentUser = getCurrentUser(req);

  if (isManagerRole(currentUser.role)) {
    return { currentUser, student: null as any };
  }

  const student: any = await getStudentProfileByUserId(currentUser.id);

  if (!student) {
    throw new AppError("Student profile not found", 404);
  }

  return { currentUser, student };
};

const ensureMockTestAccess = async (req: Request, mockTest: any) => {
  const { currentUser } = await getAccessibleStudent(req);

  if (isManagerRole(currentUser.role)) {
    return { currentUser, student: null as any };
  }

  const student: any = await getStudentProfileByUserId(currentUser.id);

  if (!student || Number(mockTest.studentId) !== Number(student.id)) {
    throw new AppError("Access denied", 403);
  }

  return { currentUser, student };
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
    return `Strong ${subjectName} performance. Keep revising the few missed concepts and maintain speed with timed practice.`;
  }

  if ((metrics.percentage ?? 0) >= 50) {
    return `Decent ${subjectName} progress. Review the incorrect answers, focus on repeated mistakes, and retake a similar difficulty test.`;
  }

  return `More practice is needed in ${subjectName}. Revisit the basics, study each explanation carefully, and attempt an easier mock test before moving up.`;
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
    .filter(
      (option): option is MockOption =>
        isObject(option) &&
        typeof option.key === "string" &&
        typeof option.text === "string",
    )
    .map((option) => ({
      key: option.key,
      text: option.text,
    }));
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
  const assignedByRole =
    normalizeRole(assignedByUser?.role) ??
    (currentUser && Number(assignedByUserId) === Number(currentUser.id)
      ? currentUser.role
      : null);

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
    assignedByTeacher:
      assignedByRole === "teacher" || assignedByRole === "head_teacher",
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
    startTime: timing.startTime,
    endTime: timing.endTime,
    timeTakenSeconds: timing.timeTakenSeconds,
    timeTakenMinutes: timing.timeTakenMinutes,
    ...serializeOwnership(mockTest, currentUser),
    createdAt: mockTest.createdAt,
    updatedAt: mockTest.updatedAt,
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
  const score = correctCount;
  const percentage = totalQuestions
    ? roundToTwo((score / totalQuestions) * 100)
    : 0;
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
    correctCount,
    wrongCount,
    unansweredCount,
    percentage,
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

  const selectedSubject: any = requestedSubjectId
    ? await Subject.findByPk(String(requestedSubjectId))
    : null;

  if (requestedSubjectId && !selectedSubject) {
    throw new AppError("Subject not found", 400);
  }

  const selectedChapter: any = requestedChapterId
    ? await Chapter.findByPk(String(requestedChapterId))
    : null;

  if (requestedChapterId && !selectedChapter) {
    throw new AppError("Chapter not found", 400);
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
    selectedChapter?.name ?? toOptionalString(body.chapterName);

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
    chapterName: resolvedChapterName,
  };
};

const buildProgressSummary = (mockTests: any[]) => {
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

  return {
    summary: {
      totalTestsTaken: evaluatedTests.length,
      averagePercentage: roundToTwo(totalPercentage / evaluatedTests.length),
      highestPercentage: roundToTwo(highestPercentage),
      latestPercentage: roundToTwo(latestPercentage),
    },
    subjectPerformance: Array.from(subjectMap.values())
      .map((subject) => ({
        subjectName: subject.subjectName,
        attempts: subject.attempts,
        averagePercentage: roundToTwo(
          subject.totalPercentage / subject.attempts,
        ),
      }))
      .sort((left, right) => right.averagePercentage - left.averagePercentage),
    recentTests: evaluatedTests.slice(0, 5).map(({ mockTest, metrics }) => ({
      id: mockTest.id,
      title: mockTest.title,
      subjectName: mockTest.subjectName,
      percentage: metrics.percentage,
      score: metrics.score,
      totalQuestions: metrics.totalQuestions,
      createdAt: mockTest.createdAt,
    })),
  };
};

const buildMockTestPdf = (mockTest: any, includeAnswers: boolean) =>
  new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    const resultQuestions = Array.isArray(mockTest.result?.questions)
      ? mockTest.result.questions
      : [];

    const writeSpacing = (lines = 1) => {
      for (let index = 0; index < lines; index += 1) {
        doc.moveDown();
      }
    };

    const ensureSpace = (space = 80) => {
      if (doc.y > doc.page.height - space) {
        doc.addPage();
      }
    };

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text(String(mockTest.title ?? "Mock Test"), {
      align: "center",
    });
    writeSpacing();

    doc.fontSize(11).text(`Class: ${mockTest.className ?? "N/A"}`);
    doc.text(`Subject: ${mockTest.subjectName ?? "N/A"}`);
    if (mockTest.chapterName) {
      doc.text(`Chapter: ${mockTest.chapterName}`);
    }
    doc.text(`Level: ${mockTest.level ?? "N/A"}`);
    doc.text(`Status: ${mockTest.status ?? "N/A"}`);

    const metrics = extractMetrics(mockTest);
    if (includeAnswers && metrics.score !== null) {
      writeSpacing();
      doc.fontSize(12).text("Performance Summary", { underline: true });
      doc
        .fontSize(11)
        .text(
          `Score: ${metrics.score}/${metrics.totalQuestions} (${metrics.percentage ?? 0}%)`,
        );
      doc.text(
        `Correct: ${metrics.correctCount} | Wrong: ${metrics.wrongCount} | Unanswered: ${metrics.unansweredCount}`,
      );
      if (mockTest.aiSuggestion) {
        writeSpacing();
        doc.text(`Suggestion: ${mockTest.aiSuggestion}`);
      }
    }

    writeSpacing();
    doc.fontSize(12).text("Questions", { underline: true });
    writeSpacing();

    const questions = Array.isArray(mockTest.questions)
      ? mockTest.questions
      : [];
    questions.forEach((question: any, index: number) => {
      ensureSpace(140);

      doc.fontSize(11).text(`${index + 1}. ${String(question.question ?? "")}`);
      const options = getQuestionOptions(question.options);
      options.forEach((option) => {
        doc.text(`${option.key}. ${option.text}`);
      });

      if (includeAnswers) {
        const resultQuestion = resultQuestions[index];
        const correctAnswerText = findOptionText(
          question.options,
          question.correctAnswer,
        );

        doc.text(
          `Correct Answer: ${String(question.correctAnswer ?? "N/A")}${correctAnswerText ? `. ${correctAnswerText}` : ""}`,
        );

        if (resultQuestion?.selectedAnswer) {
          const selectedAnswerText = findOptionText(
            question.options,
            resultQuestion.selectedAnswer,
          );

          doc.text(
            `Selected Answer: ${String(resultQuestion.selectedAnswer)}${selectedAnswerText ? `. ${selectedAnswerText}` : ""}`,
          );
          doc.text(
            `Result: ${resultQuestion.isCorrect ? "Correct" : "Incorrect"}`,
          );
        }

        if (question.explanation) {
          doc.text(`Explanation: ${String(question.explanation)}`);
        }
      }

      writeSpacing();
    });

    doc.end();
  });

export const getMockTests = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { currentUser, student } = await getAccessibleStudent(req);
    const { page, limit, offset } = getPagination(req);
    const where: Record<string, unknown> = {};
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

    if (isManagerRole(currentUser.role)) {
      where.generatedByUserId = currentUser.id;

      if (queryStudentId !== undefined) {
        where.studentId = queryStudentId;
      }
    } else {
      where.studentId = student.id;
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

    if (onlyAssigned) {
      where.assignedByUserId = { [Op.not]: null };
    }

    const { rows: mockTests, count } = await MockTest.findAndCountAll({
      where,
      include: mockTestUserInclude,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
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

    const mockTest = await MockTest.create({
      studentId: targetStudent?.id ?? null,
      generatedByUserId: currentUser.id,
      assignedByUserId: targetStudent ? currentUser.id : null,
      classId: resolvedContext.classId,
      className: String(resolvedContext.className),
      subjectId: resolvedContext.subjectId,
      subjectName: String(resolvedContext.subjectName),
      chapterId: resolvedContext.chapterId,
      chapterName: resolvedContext.chapterName,
      title: resolvedTitle,
      level: normalizedLevel,
      questions: validatedQuestions,
      aiSuggestion: buildGenerationSuggestion(
        String(resolvedContext.subjectName),
        normalizedLevel,
        resolvedContext.chapterName,
      ),
      status: "generated",
    });

    res.status(201).json({
      message: targetStudent
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

    const { studentId, level, questionCount } = req.body ?? {};

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

    const mockTest = await MockTest.create({
      studentId: targetStudent?.id ?? null,
      generatedByUserId: currentUser.id,
      assignedByUserId:
        targetStudent && isManagerRole(currentUser.role) ? currentUser.id : null,
      classId: resolvedContext.classId,
      className: String(resolvedContext.className),
      subjectId: resolvedContext.subjectId,
      subjectName: String(resolvedContext.subjectName),
      chapterId: resolvedContext.chapterId,
      chapterName: resolvedContext.chapterName,
      title: generated.title,
      level: normalizedLevel,
      questions: generated.questions,
      aiSuggestion: buildGenerationSuggestion(
        String(resolvedContext.subjectName),
        normalizedLevel,
        resolvedContext.chapterName,
      ),
      status: "generated",
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
    const { mockTestId, submittedAnswers, startTime, endTime } = req.body ?? {};

    if (!mockTestId) {
      throw new AppError("mockTestId is required", 400);
    }

    const mockTest: any = await MockTest.findByPk(mockTestId);
    if (!mockTest)
      return res.status(404).json({ message: "mockTest not found" });

    const { currentUser } = await ensureMockTestAccess(req, mockTest);

    if (mockTest.status === "submitted" || mockTest.status === "evaluated") {
      throw new AppError("Mock test already submitted", 400);
    }

    const evaluatedSubmission = buildMockTestResult(
      mockTest,
      submittedAnswers,
      {
        startTime,
        endTime,
      },
    );

    await mockTest.update({
      submittedAnswers: evaluatedSubmission.submittedAnswers,
      result: evaluatedSubmission.result,
      aiSuggestion: evaluatedSubmission.aiSuggestion,
      status: "submitted",
    });

    res.json({
      message: "mock test submitted successfully",
      mockTest: serializeMockTestDetail(mockTest, true, currentUser),
      submittedBy: currentUser.role,
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

    const studentIds = normalizeStudentIds(
      req.body?.studentIds ?? req.body?.studentId,
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

    const basePayload = {
      classId: mockTest.classId,
      className: mockTest.className,
      subjectId: mockTest.subjectId,
      subjectName: mockTest.subjectName,
      title: mockTest.title,
      level: mockTest.level,
      questions: mockTest.questions,
      aiSuggestion: mockTest.aiSuggestion,
      generatedByUserId: mockTest.generatedByUserId ?? currentUser.id,
      assignedByUserId: currentUser.id,
      status: "generated",
    };

    const assignedMockTests: any[] = [];
    const firstStudentId = studentIds[0];

    if (mockTest.studentId === null || mockTest.studentId === undefined) {
      await mockTest.update({
        studentId: firstStudentId,
        assignedByUserId: currentUser.id,
      });
      assignedMockTests.push(mockTest);
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
    const { currentUser, student } = await getAccessibleStudent(req);
    const where: Record<string, unknown> = {};
    const queryStudentId = toOptionalPositiveInteger(
      req.query.studentId,
      "studentId",
    );

    if (isManagerRole(currentUser.role)) {
      if (queryStudentId !== undefined) {
        where.studentId = queryStudentId;
      }
    } else {
      where.studentId = student.id;
    }

    const mockTests = await MockTest.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });

    res.json({ progress: buildProgressSummary(mockTests) });
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
    const includeAnswersRequested = getIncludeAnswersParam(req.query);
    const includeAnswers =
      includeAnswersRequested &&
      (isManagerRole(currentUser.role) || mockTest.status !== "generated");
    const pdf = await buildMockTestPdf(mockTest, includeAnswers);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="mock-test-${mockTest.id}${
        includeAnswers ? "-with-answers" : ""
      }.pdf"`,
    );

    res.send(pdf);
  } catch (err) {
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
