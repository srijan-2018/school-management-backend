"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMarksByStudent = exports.updateMark = exports.createMark = void 0;
const mark_model_1 = __importDefault(require("../models/mark.model"));
const crud_helpers_1 = require("./crud.helpers");
exports.createMark = (0, crud_helpers_1.create)(mark_model_1.default, "mark");
exports.updateMark = (0, crud_helpers_1.update)(mark_model_1.default, "mark");
const getMarksByStudent = async (req, res, next) => {
    try {
        const marks = await mark_model_1.default.findAll({ where: { studentId: req.params.id } });
        res.json({ marks });
    }
    catch (err) {
        next(err);
    }
};
exports.getMarksByStudent = getMarksByStudent;
