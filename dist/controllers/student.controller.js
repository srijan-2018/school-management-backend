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
exports.getStudentDocuments = exports.getStudentFees = exports.getStudentResults = exports.getStudentAttendance = exports.deleteStudent = exports.updateStudent = exports.getStudentById = exports.createStudent = exports.getStudents = void 0;
const student_model_1 = __importDefault(require("../models/student.model"));
const attendance_model_1 = __importDefault(require("../models/attendance.model"));
const mark_model_1 = __importDefault(require("../models/mark.model"));
const fee_model_1 = __importDefault(require("../models/fee.model"));
const student_document_model_1 = __importDefault(require("../models/student-document.model"));
const crud_helpers_1 = require("./crud.helpers");
exports.getStudents = (0, crud_helpers_1.list)(student_model_1.default, "students");
exports.createStudent = (0, crud_helpers_1.create)(student_model_1.default, "student");
exports.getStudentById = (0, crud_helpers_1.getById)(student_model_1.default, "student");
exports.updateStudent = (0, crud_helpers_1.update)(student_model_1.default, "student");
exports.deleteStudent = (0, crud_helpers_1.remove)(student_model_1.default, "student");
const getStudentAttendance = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const attendance = yield attendance_model_1.default.findAll({
            where: { studentId: req.params.id },
            order: [["date", "DESC"]],
        });
        res.json({ attendance });
    }
    catch (err) {
        next(err);
    }
});
exports.getStudentAttendance = getStudentAttendance;
const getStudentResults = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const marks = yield mark_model_1.default.findAll({ where: { studentId: req.params.id } });
        res.json({ marks });
    }
    catch (err) {
        next(err);
    }
});
exports.getStudentResults = getStudentResults;
const getStudentFees = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const fees = yield fee_model_1.default.findAll({ where: { studentId: req.params.id } });
        res.json({ fees });
    }
    catch (err) {
        next(err);
    }
});
exports.getStudentFees = getStudentFees;
const getStudentDocuments = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const documents = yield student_document_model_1.default.findAll({
            where: { studentId: req.params.id },
        });
        res.json({ documents });
    }
    catch (err) {
        next(err);
    }
});
exports.getStudentDocuments = getStudentDocuments;
