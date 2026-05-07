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
exports.assignPermissions = exports.createPermission = exports.getPermissions = void 0;
const permission_model_1 = __importDefault(require("../models/permission.model"));
const role_model_1 = __importDefault(require("../models/role.model"));
const role_permission_model_1 = __importDefault(require("../models/role-permission.model"));
const getPermissions = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const permissions = yield permission_model_1.default.findAll({
            order: [["id", "DESC"]],
        });
        res.json({ permissions });
    }
    catch (err) {
        next(err);
    }
});
exports.getPermissions = getPermissions;
const createPermission = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, description } = (_a = req.body) !== null && _a !== void 0 ? _a : {};
        if (!name) {
            return res.status(400).json({ message: "name is required" });
        }
        const permission = yield permission_model_1.default.create({
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
});
exports.createPermission = createPermission;
const assignPermissions = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { roleId, permissionIds } = (_a = req.body) !== null && _a !== void 0 ? _a : {};
        if (!roleId || !Array.isArray(permissionIds)) {
            return res.status(400).json({
                message: "roleId and permissionIds array are required",
            });
        }
        const role = yield role_model_1.default.findByPk(roleId);
        if (!role) {
            return res.status(404).json({ message: "Role not found" });
        }
        const permissions = yield permission_model_1.default.findAll({
            where: { id: permissionIds },
        });
        if (permissions.length !== permissionIds.length) {
            return res.status(400).json({
                message: "One or more permissionIds are invalid",
            });
        }
        yield role_permission_model_1.default.destroy({ where: { roleId } });
        yield role_permission_model_1.default.bulkCreate(permissionIds.map((permissionId) => ({
            roleId,
            permissionId,
        })));
        const updatedRole = yield role_model_1.default.findByPk(roleId, {
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
});
exports.assignPermissions = assignPermissions;
