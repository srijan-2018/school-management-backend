import { Request } from "express";
import { AppError } from "../middlewares/error.middleware";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const parsePositiveInteger = (
  value: unknown,
  field: string,
  fallback: number,
) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${field} must be a positive integer`, 400);
  }

  return parsed;
};

export const getPagination = (req: Request) => {
  const page = parsePositiveInteger(req.query.page, "page", DEFAULT_PAGE);
  const requestedLimit = parsePositiveInteger(
    req.query.limit,
    "limit",
    DEFAULT_LIMIT,
  );
  const limit = Math.min(requestedLimit, MAX_LIMIT);

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
};

export const buildPagination = (page: number, limit: number, total: number) => {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
};
