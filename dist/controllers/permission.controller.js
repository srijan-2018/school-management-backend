"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignPermissions = exports.createPermission = exports.getPermissions = void 0;
const permission_model_1 = __importDefault(require("../models/permission.model"));
const role_model_1 = __importDefault(require("../models/role.model"));
const role_permission_model_1 = __importDefault(require("../models/role-permission.model"));
const getPermissions = async (req, res, next) => {
    try {
        const permissions = await permission_model_1.default.findAll({
            order: [["id", "DESC"]],
        });
        res.json({ permissions });
    }
    catch (err) {
        next(err);
    }
};
exports.getPermissions = getPermissions;
const createPermission = async (req, res, next) => {
    try {
        const { name, description } = req.body ?? {};
        if (!name) {
            return res.status(400).json({ message: "name is required" });
        }
        const permission = await permission_model_1.default.create({
            name: String(name).trim().toLowerCase(),
            description,
        });
        res.status(201).json({
            message: "Permission created successfully",
            permission,
        });
    }
    catch (err) {
        next(err);
    }
};
exports.createPermission = createPermission;
const assignPermissions = async (req, res, next) => {
    try {
        const { roleId, permissionIds } = req.body ?? {};
        if (!roleId || !Array.isArray(permissionIds)) {
            return res.status(400).json({
                message: "roleId and permissionIds array are required",
            });
        }
        const role = await role_model_1.default.findByPk(roleId);
        if (!role) {
            return res.status(404).json({ message: "Role not found" });
        }
        const permissions = await permission_model_1.default.findAll({
            where: { id: permissionIds },
        });
        if (permissions.length !== permissionIds.length) {
            return res.status(400).json({
                message: "One or more permissionIds are invalid",
            });
        }
        await role_permission_model_1.default.destroy({ where: { roleId } });
        await role_permission_model_1.default.bulkCreate(permissionIds.map((permissionId) => ({
            roleId,
            permissionId,
        })));
        const updatedRole = await role_model_1.default.findByPk(roleId, {
            include: [permission_model_1.default],
        });
        res.json({
            message: "Permissions assigned successfully",
            role: updatedRole,
        });
    }
    catch (err) {
        next(err);
    }
};
exports.assignPermissions = assignPermissions;
