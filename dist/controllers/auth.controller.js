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
exports.login = exports.register = void 0;
const user_model_1 = __importDefault(require("../models/user.model"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const roles_1 = require("../utils/roles");
// REGISTER
const register = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password || !role) {
            return res.status(400).json({
                message: "name, email, password and role are required",
            });
        }
        const normalizedEmail = String(email).trim().toLowerCase();
        const normalizedRole = (0, roles_1.normalizeRole)(role);
        if (!normalizedRole) {
            return res.status(400).json({
                message: `Invalid role. Allowed roles: ${roles_1.USER_ROLES.join(", ")}`,
            });
        }
        const exist = yield user_model_1.default.findOne({ where: { email: normalizedEmail } });
        if (exist) {
            return res.status(400).json({ message: "User already exists" });
        }
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        const user = yield user_model_1.default.create({
            name: String(name).trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: normalizedRole,
        });
        res.status(201).json({
            message: "User registered",
            user: {
                id: user.get("id"),
                name: user.get("name"),
                email: user.get("email"),
                role: user.get("role"),
            },
        });
    }
    catch (err) {
        next(err);
    }
});
exports.register = register;
// LOGIN
const login = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                message: "email and password are required",
            });
        }
        const normalizedEmail = String(email).trim().toLowerCase();
        const user = yield user_model_1.default.findOne({ where: { email: normalizedEmail } });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        const isMatch = yield bcryptjs_1.default.compare(password, user.password);
        if (!isMatch)
            return res.status(400).json({ message: "Wrong password" });
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ message: "JWT_SECRET is not configured" });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
        res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
exports.login = login;
