"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAttendanceByStudent = exports.getAttendanceByClass = exports.updateAttendance = exports.markAttendance = void 0;
const attendance_model_1 = __importDefault(require("../models/attendance.model"));
const crud_helpers_1 = require("./crud.helpers");
exports.markAttendance = (0, crud_helpers_1.create)(attendance_model_1.default, "attendance");
exports.updateAttendance = (0, crud_helpers_1.update)(attendance_model_1.default, "attendance");
const getAttendanceByClass = async (req, res, next) => {
    try {
        const attendance = await attendance_model_1.default.findAll({
            where: { classId: req.params.classId },
            order: [["date", "DESC"]],
        });
        res.json({ attendance });
    }
    catch (err) {
        next(err);
    }
};
exports.getAttendanceByClass = getAttendanceByClass;
const getAttendanceByStudent = async (req, res, next) => {
    try {
        const attendance = await attendance_model_1.default.findAll({
            where: { studentId: req.params.studentId },
            order: [["date", "DESC"]],
        });
        res.json({ attendance });
    }
    catch (err) {
        next(err);
    }
};
exports.getAttendanceByStudent = getAttendanceByStudent;
