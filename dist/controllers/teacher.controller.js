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
exports.getTeacherSchedule = exports.getTeacherClasses = exports.deleteTeacher = exports.updateTeacher = exports.createTeacher = exports.getTeachers = void 0;
const teacher_model_1 = __importDefault(require("../models/teacher.model"));
const teacher_class_model_1 = __importDefault(require("../models/teacher-class.model"));
const timetable_model_1 = __importDefault(require("../models/timetable.model"));
const crud_helpers_1 = require("./crud.helpers");
exports.getTeachers = (0, crud_helpers_1.list)(teacher_model_1.default, "teachers");
exports.createTeacher = (0, crud_helpers_1.create)(teacher_model_1.default, "teacher");
exports.updateTeacher = (0, crud_helpers_1.update)(teacher_model_1.default, "teacher");
exports.deleteTeacher = (0, crud_helpers_1.remove)(teacher_model_1.default, "teacher");
const getTeacherClasses = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const classes = yield teacher_class_model_1.default.findAll({
            where: { teacherId: req.params.id },
        });
        res.json({ classes });
    }
    catch (err) {
        next(err);
    }
});
exports.getTeacherClasses = getTeacherClasses;
const getTeacherSchedule = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const schedule = yield timetable_model_1.default.findAll({
            where: { teacherId: req.params.id },
        });
        res.json({ schedule });
    }
    catch (err) {
        next(err);
    }
});
exports.getTeacherSchedule = getTeacherSchedule;
