"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMockTestAiSuggestion = exports.submitMockTest = exports.getMockTestResult = exports.generateMockTest = void 0;
const mock_test_model_1 = __importDefault(require("../models/mock-test.model"));
const crud_helpers_1 = require("./crud.helpers");
exports.generateMockTest = (0, crud_helpers_1.create)(mock_test_model_1.default, "mockTest");
exports.getMockTestResult = (0, crud_helpers_1.getById)(mock_test_model_1.default, "mockTest");
const submitMockTest = async (req, res, next) => {
    try {
        const { mockTestId, submittedAnswers, result, aiSuggestion } = req.body ?? {};
        const mockTest = await mock_test_model_1.default.findByPk(mockTestId);
        if (!mockTest)
            return res.status(404).json({ message: "mockTest not found" });
        await mockTest.update({
            submittedAnswers,
            result,
            aiSuggestion,
            status: "submitted",
        });
        res.json({ message: "mock test submitted successfully", mockTest });
    }
    catch (err) {
        next(err);
    }
};
exports.submitMockTest = submitMockTest;
const getMockTestAiSuggestion = async (req, res, next) => {
    try {
        const mockTest = await mock_test_model_1.default.findByPk(String(req.params.id));
        if (!mockTest)
            return res.status(404).json({ message: "mockTest not found" });
        res.json({ aiSuggestion: mockTest.aiSuggestion, result: mockTest.result });
    }
    catch (err) {
        next(err);
    }
};
exports.getMockTestAiSuggestion = getMockTestAiSuggestion;
