"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateExam = exports.getExamById = exports.getExams = exports.createExam = void 0;
const exam_model_1 = __importDefault(require("../models/exam.model"));
const crud_helpers_1 = require("./crud.helpers");
exports.createExam = (0, crud_helpers_1.create)(exam_model_1.default, "exam");
exports.getExams = (0, crud_helpers_1.list)(exam_model_1.default, "exams");
exports.getExamById = (0, crud_helpers_1.getById)(exam_model_1.default, "exam");
exports.updateExam = (0, crud_helpers_1.update)(exam_model_1.default, "exam");
