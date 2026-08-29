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
  let statusCode = err instanceof AppError ? err.statusCode : 500;
  let message =
    err instanceof Error ? err.message || "Internal Server Error" : "Internal Server Error";

  const sequelizeError = err as {
    name?: string;
    message?: string;
    errors?: Array<{ message?: string; path?: string }>;
    parent?: { code?: string; sqlMessage?: string };
  };

  if (sequelizeError?.name === "SequelizeForeignKeyConstraintError") {
    statusCode = 400;
    message =
      "One or more classId values are invalid. Use class IDs from the selected school.";
  } else if (sequelizeError?.name === "SequelizeUniqueConstraintError") {
    statusCode = 409;
    message =
      sequelizeError.errors?.[0]?.message ||
      "A subject with the same details already exists.";
  } else if (sequelizeError?.name === "SequelizeValidationError") {
    statusCode = 400;
    message =
      sequelizeError.errors?.map((item) => item.message).filter(Boolean).join("; ") ||
      sequelizeError.message ||
      "Validation failed";
  } else if (sequelizeError?.parent?.sqlMessage) {
    message = sequelizeError.parent.sqlMessage;
  }

  const sqlMessage = sequelizeError?.parent?.sqlMessage;

  if (statusCode === 500 && process.env.NODE_ENV === "production") {
    message = "Internal Server Error";
  }

  console.error("Request failed", {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message,
    sqlMessage,
    stack: err instanceof Error ? err.stack : undefined,
  });

  const response: Record<string, unknown> = {
    success: false,
    message,
  };

  if (process.env.NODE_ENV !== "production" && err instanceof Error) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
