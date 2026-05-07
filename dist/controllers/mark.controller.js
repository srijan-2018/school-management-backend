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
exports.getMarksByStudent = exports.updateMark = exports.createMark = void 0;
const mark_model_1 = __importDefault(require("../models/mark.model"));
const crud_helpers_1 = require("./crud.helpers");
exports.createMark = (0, crud_helpers_1.create)(mark_model_1.default, "mark");
exports.updateMark = (0, crud_helpers_1.update)(mark_model_1.default, "mark");
const getMarksByStudent = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const marks = yield mark_model_1.default.findAll({ where: { studentId: req.params.id } });
        res.json({ marks });
    }
    catch (err) {
        next(err);
    }
});
exports.getMarksByStudent = getMarksByStudent;
