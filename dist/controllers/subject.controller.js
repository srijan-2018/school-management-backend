"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSubject = exports.updateSubject = exports.createSubject = exports.getSubjects = void 0;
const subject_model_1 = __importDefault(require("../models/subject.model"));
const crud_helpers_1 = require("./crud.helpers");
exports.getSubjects = (0, crud_helpers_1.list)(subject_model_1.default, "subjects");
exports.createSubject = (0, crud_helpers_1.create)(subject_model_1.default, "subject");
exports.updateSubject = (0, crud_helpers_1.update)(subject_model_1.default, "subject");
exports.deleteSubject = (0, crud_helpers_1.remove)(subject_model_1.default, "subject");
