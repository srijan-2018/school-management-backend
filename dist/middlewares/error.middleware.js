"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFoundHandler = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const notFoundHandler = (req, res, next) => {
    next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};
exports.notFoundHandler = notFoundHandler;
const errorHandler = (err, req, res, next) => {
    const error = err instanceof Error ? err : new Error("Internal Server Error");
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const message = statusCode === 500 && process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : error.message || "Internal Server Error";
    const response = {
        success: false,
        message,
    };
    if (process.env.NODE_ENV !== "production") {
        response.stack = error.stack;
    }
    res.status(statusCode).json(response);
};
exports.errorHandler = errorHandler;
