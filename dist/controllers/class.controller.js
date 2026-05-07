"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteClass = exports.updateClass = exports.createClass = exports.getClasses = void 0;
const class_model_1 = __importDefault(require("../models/class.model"));
const crud_helpers_1 = require("./crud.helpers");
exports.getClasses = (0, crud_helpers_1.list)(class_model_1.default, "classes");
exports.createClass = (0, crud_helpers_1.create)(class_model_1.default, "class");
exports.updateClass = (0, crud_helpers_1.update)(class_model_1.default, "class");
exports.deleteClass = (0, crud_helpers_1.remove)(class_model_1.default, "class");
