"use strict";
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
const getStudentAttendance = async (req, res, next) => {
    try {
        const attendance = await attendance_model_1.default.findAll({
            where: { studentId: req.params.id },
            order: [["date", "DESC"]],
        });
        res.json({ attendance });
    }
    catch (err) {
        next(err);
    }
};
exports.getStudentAttendance = getStudentAttendance;
const getStudentResults = async (req, res, next) => {
    try {
        const marks = await mark_model_1.default.findAll({ where: { studentId: req.params.id } });
        res.json({ marks });
    }
    catch (err) {
        next(err);
    }
};
exports.getStudentResults = getStudentResults;
const getStudentFees = async (req, res, next) => {
    try {
        const fees = await fee_model_1.default.findAll({ where: { studentId: req.params.id } });
        res.json({ fees });
    }
    catch (err) {
        next(err);
    }
};
exports.getStudentFees = getStudentFees;
const getStudentDocuments = async (req, res, next) => {
    try {
        const documents = await student_document_model_1.default.findAll({
            where: { studentId: req.params.id },
        });
        res.json({ documents });
    }
    catch (err) {
        next(err);
    }
};
exports.getStudentDocuments = getStudentDocuments;
