import { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const error = err instanceof Error ? err : new Error("Internal Server Error");
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message =
    statusCode === 500 && process.env.NODE_ENV === "production"
      ? "Internal Server Error"
      : error.message || "Internal Server Error";

  console.error("Request failed", {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message: error.message,
    stack: error.stack,
  });

  const response: Record<string, unknown> = {
    success: false,
    message,
  };

  if (process.env.NODE_ENV !== "production") {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
};
