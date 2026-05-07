"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.getUserById = exports.createUser = exports.getUsers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const user_model_1 = __importDefault(require("../models/user.model"));
const roles_1 = require("../utils/roles");
const userSafeAttributes = {
    exclude: ["password", "resetPasswordToken", "resetPasswordExpires"],
};
const getUsers = async (req, res, next) => {
    try {
        const users = await user_model_1.default.findAll({
            attributes: userSafeAttributes,
            order: [["id", "DESC"]],
        });
        res.json({ users });
    }
    catch (err) {
        next(err);
    }
};
exports.getUsers = getUsers;
const createUser = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body ?? {};
        if (!name || !email || !password || !role) {
            return res.status(400).json({
                message: "name, email, password and role are required",
            });
        }
        const normalizedRole = (0, roles_1.normalizeRole)(role);
        if (!normalizedRole) {
            return res.status(400).json({
                message: `Invalid role. Allowed roles: ${roles_1.USER_ROLES.join(", ")}`,
            });
        }
        const normalizedEmail = String(email).trim().toLowerCase();
        const exist = await user_model_1.default.findOne({ where: { email: normalizedEmail } });
        if (exist) {
            return res.status(400).json({ message: "User already exists" });
        }
        const user = await user_model_1.default.create({
            name: String(name).trim(),
            email: normalizedEmail,
            password: await bcryptjs_1.default.hash(password, 10),
            role: normalizedRole,
        });
        const createdUser = await user_model_1.default.findByPk(user.get("id"), {
            attributes: userSafeAttributes,
        });
        res.status(201).json({
            message: "User created successfully",
            user: createdUser,
        });
    }
    catch (err) {
        next(err);
    }
};
exports.createUser = createUser;
const getUserById = async (req, res, next) => {
    try {
        const user = await user_model_1.default.findByPk(String(req.params.id), {
            attributes: userSafeAttributes,
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ user });
    }
    catch (err) {
        next(err);
    }
};
exports.getUserById = getUserById;
const updateUser = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body ?? {};
        const user = await user_model_1.default.findByPk(String(req.params.id));
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (email) {
            user.email = String(email).trim().toLowerCase();
        }
        if (name) {
            user.name = String(name).trim();
        }
        if (password) {
            user.password = await bcryptjs_1.default.hash(password, 10);
        }
        if (role) {
            const normalizedRole = (0, roles_1.normalizeRole)(role);
            if (!normalizedRole) {
                return res.status(400).json({
                    message: `Invalid role. Allowed roles: ${roles_1.USER_ROLES.join(", ")}`,
                });
            }
            user.role = normalizedRole;
        }
        await user.save();
        const updatedUser = await user_model_1.default.findByPk(user.id, {
            attributes: userSafeAttributes,
        });
        res.json({
            message: "User updated successfully",
            user: updatedUser,
        });
    }
    catch (err) {
        next(err);
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res, next) => {
    try {
        const user = await user_model_1.default.findByPk(String(req.params.id));
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        await user.destroy();
        res.json({ message: "User deleted successfully" });
    }
    catch (err) {
        next(err);
    }
};
exports.deleteUser = deleteUser;
