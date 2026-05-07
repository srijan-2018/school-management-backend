"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMockTestAiSuggestion = exports.submitMockTest = exports.getMockTestResult = exports.generateMockTest = void 0;
const mock_test_model_1 = __importDefault(require("../models/mock-test.model"));
const crud_helpers_1 = require("./crud.helpers");
exports.generateMockTest = (0, crud_helpers_1.create)(mock_test_model_1.default, "mockTest");
exports.getMockTestResult = (0, crud_helpers_1.getById)(mock_test_model_1.default, "mockTest");
const submitMockTest = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { mockTestId, submittedAnswers, result, aiSuggestion } = (_a = req.body) !== null && _a !== void 0 ? _a : {};
        const mockTest = yield mock_test_model_1.default.findByPk(mockTestId);
        if (!mockTest)
            return res.status(404).json({ message: "mockTest not found" });
        yield mockTest.update({
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
});
exports.submitMockTest = submitMockTest;
const getMockTestAiSuggestion = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const mockTest = yield mock_test_model_1.default.findByPk(String(req.params.id));
        if (!mockTest)
            return res.status(404).json({ message: "mockTest not found" });
        res.json({ aiSuggestion: mockTest.aiSuggestion, result: mockTest.result });
    }
    catch (err) {
        next(err);
    }
});
exports.getMockTestAiSuggestion = getMockTestAiSuggestion;
