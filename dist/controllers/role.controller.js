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
exports.deleteRole = exports.updateRole = exports.createRole = exports.getRoles = void 0;
const role_model_1 = __importDefault(require("../models/role.model"));
const getRoles = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const roles = yield role_model_1.default.findAll({ order: [["id", "DESC"]] });
        res.json({ roles });
    }
    catch (err) {
        next(err);
    }
});
exports.getRoles = getRoles;
const createRole = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, description } = (_a = req.body) !== null && _a !== void 0 ? _a : {};
        if (!name) {
            return res.status(400).json({ message: "name is required" });
        }
        const role = yield role_model_1.default.create({
            name: String(name).trim().toLowerCase(),
            description,
        });
        res.status(201).json({
            message: "Role created successfully",
            role,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.createRole = createRole;
const updateRole = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, description } = (_a = req.body) !== null && _a !== void 0 ? _a : {};
        const role = yield role_model_1.default.findByPk(String(req.params.id));
        if (!role) {
            return res.status(404).json({ message: "Role not found" });
        }
        if (name) {
            role.name = String(name).trim().toLowerCase();
        }
        if (description !== undefined) {
            role.description = description;
        }
        yield role.save();
        res.json({
            message: "Role updated successfully",
            role,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.updateRole = updateRole;
const deleteRole = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const role = yield role_model_1.default.findByPk(String(req.params.id));
        if (!role) {
            return res.status(404).json({ message: "Role not found" });
        }
        yield role.destroy();
        res.json({ message: "Role deleted successfully" });
    }
    catch (err) {
        next(err);
    }
});
exports.deleteRole = deleteRole;
