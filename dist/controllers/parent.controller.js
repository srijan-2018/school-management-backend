"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParentStudents = exports.createParent = exports.updateParent = exports.getParents = void 0;
const parent_model_1 = __importDefault(require("../models/parent.model"));
const parent_student_model_1 = __importDefault(require("../models/parent-student.model"));
const crud_helpers_1 = require("./crud.helpers");
exports.getParents = (0, crud_helpers_1.list)(parent_model_1.default, "parents");
exports.updateParent = (0, crud_helpers_1.update)(parent_model_1.default, "parent");
const createParent = async (req, res, next) => {
    try {
        const { studentIds, ...payload } = req.body ?? {};
        const parent = await parent_model_1.default.create(payload);
        if (Array.isArray(studentIds)) {
            await parent_student_model_1.default.bulkCreate(studentIds.map((studentId) => ({
                parentId: parent.id,
                studentId,
            })), { ignoreDuplicates: true });
        }
        res.status(201).json({ message: "parent created successfully", parent });
    }
    catch (err) {
        next(err);
    }
};
exports.createParent = createParent;
const getParentStudents = async (req, res, next) => {
    try {
        const students = await parent_student_model_1.default.findAll({
            where: { parentId: req.params.id },
        });
        res.json({ students });
    }
    catch (err) {
        next(err);
    }
};
exports.getParentStudents = getParentStudents;
