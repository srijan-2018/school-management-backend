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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
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
const createParent = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const _b = (_a = req.body) !== null && _a !== void 0 ? _a : {}, { studentIds } = _b, payload = __rest(_b, ["studentIds"]);
        const parent = yield parent_model_1.default.create(payload);
        if (Array.isArray(studentIds)) {
            yield parent_student_model_1.default.bulkCreate(studentIds.map((studentId) => ({
                parentId: parent.id,
                studentId,
            })), { ignoreDuplicates: true });
        }
        res.status(201).json({ message: "parent created successfully", parent });
    }
    catch (err) {
        next(err);
    }
});
exports.createParent = createParent;
const getParentStudents = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const students = yield parent_student_model_1.default.findAll({
            where: { parentId: req.params.id },
        });
        res.json({ students });
    }
    catch (err) {
        next(err);
    }
});
exports.getParentStudents = getParentStudents;
