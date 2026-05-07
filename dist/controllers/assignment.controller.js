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
exports.getAssignmentsByStudent = exports.submitAssignment = exports.getAssignments = exports.createAssignment = void 0;
const assignment_model_1 = __importDefault(require("../models/assignment.model"));
const assignment_submission_model_1 = __importDefault(require("../models/assignment-submission.model"));
const crud_helpers_1 = require("./crud.helpers");
exports.createAssignment = (0, crud_helpers_1.create)(assignment_model_1.default, "assignment");
exports.getAssignments = (0, crud_helpers_1.list)(assignment_model_1.default, "assignments");
exports.submitAssignment = (0, crud_helpers_1.create)(assignment_submission_model_1.default, "submission");
const getAssignmentsByStudent = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const submissions = yield assignment_submission_model_1.default.findAll({
            where: { studentId: req.params.id },
        });
        res.json({ submissions });
    }
    catch (err) {
        next(err);
    }
});
exports.getAssignmentsByStudent = getAssignmentsByStudent;
