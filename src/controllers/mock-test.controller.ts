import { NextFunction, Request, Response } from "express";
import Class from "../models/class.model";
import MockTest from "../models/mock-test.model";
import Subject from "../models/subject.model";
import { getById } from "./crud.helpers";
import { generateMockTestWithAi } from "../services/mock-test-ai.service";

export const getMockTestResult = getById(MockTest, "mockTest");

const allowedLevels = ["easy", "medium", "hard"] as const;

const toPositiveInteger = (value: unknown, fallback: number) => {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue <= 0) return fallback;
  return numberValue;
};

export const generateMockTest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      studentId,
      classId,
      className,
      subjectId,
      subjectName,
      level,
      questionCount,
    } = req.body ?? {};

    const normalizedLevel = String(level ?? "").toLowerCase();
    if (!allowedLevels.includes(normalizedLevel as (typeof allowedLevels)[number])) {
      return res.status(400).json({
        message: "level is required and must be one of: easy, medium, hard",
      });
    }

    const selectedClass: any = classId ? await Class.findByPk(String(classId)) : null;
    const selectedSubject: any = subjectId ? await Subject.findByPk(String(subjectId)) : null;

    const resolvedClassName = selectedClass?.name ?? className;
    const resolvedSubjectName = selectedSubject?.name ?? subjectName;

    if (!resolvedClassName || !resolvedSubjectName) {
      return res.status(400).json({
        message: "className and subjectName are required, or provide valid classId and subjectId",
      });
    }

    const count = Math.min(toPositiveInteger(questionCount, 10), 50);
    const generated = await generateMockTestWithAi({
      className: String(resolvedClassName),
      subjectName: String(resolvedSubjectName),
      level: normalizedLevel as "easy" | "medium" | "hard",
      questionCount: count,
    });

    const mockTest = await MockTest.create({
      studentId,
      classId: selectedClass?.id ?? classId,
      className: String(resolvedClassName),
      subjectId: selectedSubject?.id ?? subjectId,
      subjectName: String(resolvedSubjectName),
      title: generated.title,
      level: normalizedLevel,
      questions: generated.questions,
      status: "generated",
    });

    res.status(201).json({
      message: "mock test generated successfully",
      provider: generated.provider,
      model: generated.model,
      mockTest,
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
    const { mockTestId, submittedAnswers, result, aiSuggestion } = req.body ?? {};
    const mockTest: any = await MockTest.findByPk(mockTestId);
    if (!mockTest) return res.status(404).json({ message: "mockTest not found" });

    await mockTest.update({
      submittedAnswers,
      result,
      aiSuggestion,
      status: "submitted",
    });

    res.json({ message: "mock test submitted successfully", mockTest });
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
    if (!mockTest) return res.status(404).json({ message: "mockTest not found" });
    res.json({ aiSuggestion: mockTest.aiSuggestion, result: mockTest.result });
  } catch (err) {
    next(err);
  }
};
