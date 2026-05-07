"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSection = exports.getSections = void 0;
const section_model_1 = __importDefault(require("../models/section.model"));
const crud_helpers_1 = require("./crud.helpers");
exports.getSections = (0, crud_helpers_1.list)(section_model_1.default, "sections");
exports.createSection = (0, crud_helpers_1.create)(section_model_1.default, "section");
