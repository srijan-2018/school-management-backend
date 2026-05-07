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
exports.resetPassword = exports.forgotPassword = exports.changePassword = exports.logout = exports.refreshToken = exports.login = exports.register = void 0;
const user_model_1 = __importDefault(require("../models/user.model"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const roles_1 = require("../utils/roles");
const getJwtSecret = () => process.env.JWT_SECRET;
const getRefreshTokenSecret = () => process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
const revokedRefreshTokens = new Set();
const generateTokens = (user) => {
    const jwtSecret = getJwtSecret();
    const refreshTokenSecret = getRefreshTokenSecret();
    if (!jwtSecret) {
        throw new Error("JWT_SECRET is not configured");
    }
    if (!refreshTokenSecret) {
        throw new Error("JWT_REFRESH_SECRET is not configured");
    }
    const payload = { id: user.id, role: user.role };
    const accessToken = jsonwebtoken_1.default.sign(payload, jwtSecret, { expiresIn: "30m" });
    const refreshToken = jsonwebtoken_1.default.sign(payload, refreshTokenSecret, {
        expiresIn: "30d",
    });
    return { accessToken, refreshToken };
};
// REGISTER
const register = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, email, password, role } = (_a = req.body) !== null && _a !== void 0 ? _a : {};
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
        const { accessToken, refreshToken } = generateTokens({
            id: user.get("id"),
            role: user.get("role"),
        });
        res.status(201).json({
            message: "User registered",
            token: accessToken,
            accessToken,
            refreshToken,
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
    var _a;
    try {
        const { email, password } = (_a = req.body) !== null && _a !== void 0 ? _a : {};
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
        const { accessToken, refreshToken } = generateTokens(user);
        res.json({
            message: "Login successful",
            token: accessToken,
            accessToken,
            refreshToken,
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
const refreshToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { refreshToken } = (_a = req.body) !== null && _a !== void 0 ? _a : {};
        if (!refreshToken) {
            return res.status(400).json({ message: "refreshToken is required" });
        }
        if (revokedRefreshTokens.has(refreshToken)) {
            return res.status(401).json({ message: "Invalid refresh token" });
        }
        const refreshTokenSecret = getRefreshTokenSecret();
        if (!refreshTokenSecret) {
            return res.status(500).json({
                message: "JWT_REFRESH_SECRET is not configured",
            });
        }
        const decoded = jsonwebtoken_1.default.verify(refreshToken, refreshTokenSecret);
        if (typeof decoded === "string" ||
            typeof decoded.id !== "number" ||
            typeof decoded.role !== "string") {
            return res.status(401).json({ message: "Invalid refresh token" });
        }
        const user = yield user_model_1.default.findByPk(decoded.id);
        if (!user) {
            return res.status(401).json({ message: "Invalid refresh token" });
        }
        const tokens = generateTokens(user);
        res.json({
            message: "Token refreshed",
            token: tokens.accessToken,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        });
    }
    catch (err) {
        return res.status(401).json({ message: "Invalid refresh token" });
    }
});
exports.refreshToken = refreshToken;
const logout = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { refreshToken } = (_a = req.body) !== null && _a !== void 0 ? _a : {};
        if (!refreshToken) {
            return res.status(400).json({ message: "refreshToken is required" });
        }
        revokedRefreshTokens.add(refreshToken);
        res.json({
            message: "Logout successful",
        });
    }
    catch (err) {
        next(err);
    }
});
exports.logout = logout;
const changePassword = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { currentPassword, newPassword } = (_a = req.body) !== null && _a !== void 0 ? _a : {};
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: "currentPassword and newPassword are required",
            });
        }
        if (String(newPassword).length < 6) {
            return res.status(400).json({
                message: "newPassword must be at least 6 characters",
            });
        }
        const user = yield user_model_1.default.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const isMatch = yield bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Current password is wrong" });
        }
        user.password = yield bcryptjs_1.default.hash(newPassword, 10);
        yield user.save();
        res.json({
            message: "Password changed successfully",
        });
    }
    catch (err) {
        next(err);
    }
});
exports.changePassword = changePassword;
const forgotPassword = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { email } = (_a = req.body) !== null && _a !== void 0 ? _a : {};
        if (!email) {
            return res.status(400).json({ message: "email is required" });
        }
        const normalizedEmail = String(email).trim().toLowerCase();
        const user = yield user_model_1.default.findOne({ where: { email: normalizedEmail } });
        if (!user) {
            return res.json({
                message: "If the email exists, a password reset token has been created",
            });
        }
        const resetToken = crypto_1.default.randomBytes(32).toString("hex");
        const hashedResetToken = crypto_1.default
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");
        user.resetPasswordToken = hashedResetToken;
        user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
        yield user.save();
        const response = {
            message: "Password reset token created",
        };
        if (process.env.NODE_ENV !== "production") {
            response.resetToken = resetToken;
            response.expiresIn = "15 minutes";
        }
        res.json(response);
    }
    catch (err) {
        next(err);
    }
});
exports.forgotPassword = forgotPassword;
const resetPassword = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { resetToken, newPassword } = (_a = req.body) !== null && _a !== void 0 ? _a : {};
        if (!resetToken || !newPassword) {
            return res.status(400).json({
                message: "resetToken and newPassword are required",
            });
        }
        if (String(newPassword).length < 6) {
            return res.status(400).json({
                message: "newPassword must be at least 6 characters",
            });
        }
        const hashedResetToken = crypto_1.default
            .createHash("sha256")
            .update(String(resetToken))
            .digest("hex");
        const user = yield user_model_1.default.findOne({
            where: {
                resetPasswordToken: hashedResetToken,
            },
        });
        if (!user ||
            !user.resetPasswordExpires ||
            new Date(user.resetPasswordExpires).getTime() < Date.now()) {
            return res.status(400).json({
                message: "Invalid or expired reset token",
            });
        }
        user.password = yield bcryptjs_1.default.hash(newPassword, 10);
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        yield user.save();
        res.json({
            message: "Password reset successfully",
        });
    }
    catch (err) {
        next(err);
    }
});
exports.resetPassword = resetPassword;
