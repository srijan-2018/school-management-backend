"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRole = exports.updateRole = exports.createRole = exports.getRoles = void 0;
const role_model_1 = __importDefault(require("../models/role.model"));
const getRoles = async (req, res, next) => {
    try {
        const roles = await role_model_1.default.findAll({ order: [["id", "DESC"]] });
        res.json({ roles });
    }
    catch (err) {
        next(err);
    }
};
exports.getRoles = getRoles;
const createRole = async (req, res, next) => {
    try {
        const { name, description } = req.body ?? {};
        if (!name) {
            return res.status(400).json({ message: "name is required" });
        }
        const role = await role_model_1.default.create({
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
};
exports.createRole = createRole;
const updateRole = async (req, res, next) => {
    try {
        const { name, description } = req.body ?? {};
        const role = await role_model_1.default.findByPk(String(req.params.id));
        if (!role) {
            return res.status(404).json({ message: "Role not found" });
        }
        if (name) {
            role.name = String(name).trim().toLowerCase();
        }
        if (description !== undefined) {
            role.description = description;
        }
        await role.save();
        res.json({
            message: "Role updated successfully",
            role,
        });
    }
    catch (err) {
        next(err);
    }
};
exports.updateRole = updateRole;
const deleteRole = async (req, res, next) => {
    try {
        const role = await role_model_1.default.findByPk(String(req.params.id));
        if (!role) {
            return res.status(404).json({ message: "Role not found" });
        }
        await role.destroy();
        res.json({ message: "Role deleted successfully" });
    }
    catch (err) {
        next(err);
    }
};
exports.deleteRole = deleteRole;
