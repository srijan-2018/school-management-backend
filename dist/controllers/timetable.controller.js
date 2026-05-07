"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimetableByClass = exports.updateTimetable = exports.createTimetable = void 0;
const timetable_model_1 = __importDefault(require("../models/timetable.model"));
const crud_helpers_1 = require("./crud.helpers");
exports.createTimetable = (0, crud_helpers_1.create)(timetable_model_1.default, "timetable");
exports.updateTimetable = (0, crud_helpers_1.update)(timetable_model_1.default, "timetable");
const getTimetableByClass = async (req, res, next) => {
    try {
        const timetable = await timetable_model_1.default.findAll({
            where: { classId: req.params.id },
        });
        res.json({ timetable });
    }
    catch (err) {
        next(err);
    }
};
exports.getTimetableByClass = getTimetableByClass;
