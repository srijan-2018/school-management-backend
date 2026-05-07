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
exports.getTimetableByClass = exports.updateTimetable = exports.createTimetable = void 0;
const timetable_model_1 = __importDefault(require("../models/timetable.model"));
const crud_helpers_1 = require("./crud.helpers");
exports.createTimetable = (0, crud_helpers_1.create)(timetable_model_1.default, "timetable");
exports.updateTimetable = (0, crud_helpers_1.update)(timetable_model_1.default, "timetable");
const getTimetableByClass = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const timetable = yield timetable_model_1.default.findAll({
            where: { classId: req.params.id },
        });
        res.json({ timetable });
    }
    catch (err) {
        next(err);
    }
});
exports.getTimetableByClass = getTimetableByClass;
