"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowRoles = exports.verifyToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const roles_1 = require("../utils/roles");
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : authHeader;
    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }
    if (!process.env.JWT_SECRET) {
        return res.status(500).json({ message: "JWT_SECRET is not configured" });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({ message: "Invalid token" });
    }
};
exports.verifyToken = verifyToken;
const allowRoles = (...roles) => {
    return (req, res, next) => {
        var _a;
        const currentRole = (0, roles_1.normalizeRole)((_a = req.user) === null || _a === void 0 ? void 0 : _a.role);
        if (!currentRole || !roles.includes(currentRole)) {
            return res.status(403).json({ message: "Access denied" });
        }
        next();
    };
};
exports.allowRoles = allowRoles;
