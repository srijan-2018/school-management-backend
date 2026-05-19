import { NextFunction, Request, Response } from "express";
import PDFDocument from "pdfkit";
import Class from "../models/class.model";
import MockTest from "../models/mock-test.model";
import Student from "../models/student.model";
import Subject from "../models/subject.model";
import { AppError } from "../middlewares/error.middleware";
import {
  generateMockTestWithAi,
  type MockQuestion,
} from "../services/mock-test-ai.service";
import { normalizeRole, type UserRole } from "../utils/roles";

const allowedLevels = ["easy", "medium", "hard"] as const;
const mockTestManagers = new Set<UserRole>([
  "admin",
  "school_owner",
  "head_teacher",
  "teacher",
]);

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

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isManagerRole = (role: UserRole) => mockTestManagers.has(role);

const roundToTwo = (value: number) => Math.round(value * 100) / 100;

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

const serializeQuestions = (questions: unknown, includeAnswers: boolean) => {
  if (!Array.isArray(questions)) {
    return [];
  }

  return questions.map((question, index) => {
    const item = isObject(question) ? question : {};

    return {
      index,
      question: item.question ?? "",
      options: Array.isArray(item.options) ? item.options : [],
      ...(includeAnswers
        ? {
            correctAnswer: item.correctAnswer ?? null,
            explanation: item.explanation ?? null,
          }
        : {}),
    };
  });
};

const serializeMockTestSummary = (mockTest: any) => {
  const metrics = extractMetrics(mockTest);

  return {
    id: mockTest.id,
    studentId: mockTest.studentId,
    classId: mockTest.classId,
    className: mockTest.className,
    subjectId: mockTest.subjectId,
    subjectName: mockTest.subjectName,
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
    createdAt: mockTest.createdAt,
    updatedAt: mockTest.updatedAt,
  };
};

const serializeMockTestDetail = (mockTest: any, includeAnswers: boolean) => {
  const metrics = extractMetrics(mockTest);

  return {
    id: mockTest.id,
    studentId: mockTest.studentId,
    classId: mockTest.classId,
    className: mockTest.className,
    subjectId: mockTest.subjectId,
    subjectName: mockTest.subjectName,
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
    createdAt: mockTest.createdAt,
    updatedAt: mockTest.updatedAt,
  };
};

const buildMockTestResult = (mockTest: any, submittedAnswers: unknown) => {
  const questions = Array.isArray(mockTest.questions)
    ? (mockTest.questions as MockQuestion[])
    : [];

  if (questions.length === 0) {
    throw new AppError("Mock test has no questions to submit", 400);
  }

  const answers = normalizeSubmittedAnswers(submittedAnswers, questions.length);
  const answerList = questions.map(
    (_question, index) => answers.get(index) ?? null,
  );

  const questionResults = questions.map((question, index) => {
    const selectedAnswer = answers.get(index) ?? null;
    const isCorrect = selectedAnswer === question.correctAnswer;

    return {
      index,
      question: question.question,
      options: question.options,
      selectedAnswer,
      correctAnswer: question.correctAnswer,
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

  const result = {
    score,
    totalQuestions,
    correctCount,
    wrongCount,
    unansweredCount,
    percentage,
    questions: questionResults,
    submittedAt: new Date().toISOString(),
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

const resolveClassAndSubject = async (
  body: Record<string, unknown>,
  targetStudent: any,
) => {
  const requestedClassId = toOptionalPositiveInteger(body.classId, "classId");
  const requestedSubjectId = toOptionalPositiveInteger(
    body.subjectId,
    "subjectId",
  );

  const selectedSubject: any = requestedSubjectId
    ? await Subject.findByPk(String(requestedSubjectId))
    : null;

  if (requestedSubjectId && !selectedSubject) {
    throw new AppError("Subject not found", 400);
  }

  const resolvedClassId =
    requestedClassId ?? targetStudent?.classId ?? selectedSubject?.classId;

  const selectedClass: any = resolvedClassId
    ? await Class.findByPk(String(resolvedClassId))
    : null;

  if (resolvedClassId && !selectedClass) {
    throw new AppError("Class not found", 400);
  }

  if (
    selectedSubject &&
    selectedClass &&
    Number(selectedSubject.classId) !== Number(selectedClass.id)
  ) {
    throw new AppError("subjectId does not belong to classId", 400);
  }

  const resolvedClassName =
    selectedClass?.name ?? toOptionalString(body.className);
  const resolvedSubjectName =
    selectedSubject?.name ?? toOptionalString(body.subjectName);

  if (!resolvedClassName || !resolvedSubjectName) {
    throw new AppError(
      "className and subjectName are required, or provide valid classId and subjectId",
      400,
    );
  }

  return {
    classId: selectedClass?.id ?? requestedClassId ?? null,
    className: resolvedClassName,
    subjectId: selectedSubject?.id ?? requestedSubjectId ?? null,
    subjectName: resolvedSubjectName,
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
      const options = Array.isArray(question.options) ? question.options : [];
      options.forEach((option) => {
        doc.text(`- ${String(option)}`);
      });

      if (includeAnswers) {
        const resultQuestion = resultQuestions[index];
        doc.text(`Correct Answer: ${String(question.correctAnswer ?? "N/A")}`);

        if (resultQuestion?.selectedAnswer) {
          doc.text(`Selected Answer: ${String(resultQuestion.selectedAnswer)}`);
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

    let mockTests: any[] = await MockTest.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });

    if (onlyAssigned) {
      mockTests = mockTests.filter((mockTest) => mockTest.studentId);
    }

    res.json({
      mockTests: mockTests.map((mockTest) =>
        serializeMockTestSummary(mockTest),
      ),
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

    const resolvedContext = await resolveClassAndSubject(
      req.body ?? {},
      targetStudent,
    );

    const count = Math.min(toPositiveInteger(questionCount, 10), 50);
    const generated = await generateMockTestWithAi({
      className: String(resolvedContext.className),
      subjectName: String(resolvedContext.subjectName),
      level: normalizedLevel as "easy" | "medium" | "hard",
      questionCount: count,
    });

    const mockTest = await MockTest.create({
      studentId: targetStudent?.id ?? null,
      classId: resolvedContext.classId,
      className: String(resolvedContext.className),
      subjectId: resolvedContext.subjectId,
      subjectName: String(resolvedContext.subjectName),
      title: generated.title,
      level: normalizedLevel,
      questions: generated.questions,
      status: "generated",
    });

    const includeAnswers = isManagerRole(currentUser.role);

    res.status(201).json({
      message:
        targetStudent && isManagerRole(currentUser.role)
          ? "mock test generated and assigned successfully"
          : "mock test generated successfully",
      provider: generated.provider,
      model: generated.model,
      mockTest: serializeMockTestDetail(mockTest, includeAnswers),
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
    const mockTest: any = await MockTest.findByPk(String(req.params.id));

    if (!mockTest) {
      return res.status(404).json({ message: "mockTest not found" });
    }

    const { currentUser } = await ensureMockTestAccess(req, mockTest);
    const includeAnswers =
      isManagerRole(currentUser.role) || mockTest.status !== "generated";

    res.json({ mockTest: serializeMockTestDetail(mockTest, includeAnswers) });
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
    const { mockTestId, submittedAnswers } = req.body ?? {};

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

    const evaluatedSubmission = buildMockTestResult(mockTest, submittedAnswers);

    await mockTest.update({
      submittedAnswers: evaluatedSubmission.submittedAnswers,
      result: evaluatedSubmission.result,
      aiSuggestion: evaluatedSubmission.aiSuggestion,
      status: "submitted",
    });

    res.json({
      message: "mock test submitted successfully",
      mockTest: serializeMockTestDetail(mockTest, true),
      submittedBy: currentUser.role,
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
    const includeAnswersRequested = toBoolean(req.query.includeAnswers);
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
