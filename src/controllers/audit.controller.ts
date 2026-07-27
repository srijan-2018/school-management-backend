import { NextFunction, Request, Response } from "express";

import { AppError } from "../middlewares/error.middleware";
import {
  getAuditAnalytics,
  listAuditLogs,
} from "../services/audit.service";

const parseOptionalBoolean = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (value === "true" || value === true) {
    return true;
  }
  if (value === "false" || value === false) {
    return false;
  }
  return undefined;
};

export const getAuditLogs = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const actorUserId = req.query.actorUserId
      ? Number(req.query.actorUserId)
      : undefined;

    const result = await listAuditLogs({
      page,
      limit,
      module: typeof req.query.module === "string" ? req.query.module : undefined,
      action: typeof req.query.action === "string" ? req.query.action : undefined,
      success: parseOptionalBoolean(req.query.success),
      actorUserId: Number.isFinite(actorUserId) ? actorUserId : undefined,
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      from: typeof req.query.from === "string" ? req.query.from : undefined,
      to: typeof req.query.to === "string" ? req.query.to : undefined,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getAuditAnalyticsSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const days = Math.min(90, Math.max(1, Number(req.query.days) || 14));
    const analytics = await getAuditAnalytics(days);
    res.status(200).json(analytics);
  } catch (error) {
    next(error instanceof Error ? error : new AppError("Failed to load audit analytics"));
  }
};
