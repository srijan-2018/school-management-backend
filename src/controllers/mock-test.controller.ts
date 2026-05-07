import { NextFunction, Request, Response } from "express";
import MockTest from "../models/mock-test.model";
import { create, getById } from "./crud.helpers";

export const generateMockTest = create(MockTest, "mockTest");
export const getMockTestResult = getById(MockTest, "mockTest");

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
