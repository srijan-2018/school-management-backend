"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSchool = exports.getSchoolById = exports.createSchool = exports.getSchools = void 0;
const school_model_1 = __importDefault(require("../models/school.model"));
const crud_helpers_1 = require("./crud.helpers");
exports.getSchools = (0, crud_helpers_1.list)(school_model_1.default, "schools");
exports.createSchool = (0, crud_helpers_1.create)(school_model_1.default, "school");
exports.getSchoolById = (0, crud_helpers_1.getById)(school_model_1.default, "school");
exports.updateSchool = (0, crud_helpers_1.update)(school_model_1.default, "school");
