import { NextFunction, Request, Response } from "express";

import { requireSchoolId } from "../helpers/school-scope";
import { AppError } from "../middlewares/error.middleware";
import {
  canPublishNotice,
  createSchoolNotification,
  countUnreadForUser,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
  serializeNotification,
} from "../services/notification.service";
import { buildPagination, getPagination } from "../utils/pagination";
import {
  NOTIFICATION_AUDIENCE_ROLES,
  normalizeRole,
  type UserRole,
} from "../utils/roles";

function requireUser(req: Request) {
  const userId = req.user?.id;
  const role = normalizeRole(req.user?.role);

  if (!userId || !role) {
    throw new AppError("Unauthorized", 401);
  }

  return { userId, role };
}

function parseAudienceRoles(value: unknown): UserRole[] | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",").map((part) => part.trim())
      : [];

  const roles = raw
    .map((item) => normalizeRole(item))
    .filter((role): role is UserRole => Boolean(role));

  return roles.length > 0 ? roles : undefined;
}

export const listMyNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const actor = requireUser(req);
    const { page, limit } = getPagination(req);
    const unreadOnly =
      String(req.query.unreadOnly ?? "").toLowerCase() === "true" ||
      String(req.query.unreadOnly ?? "") === "1";

    const { notifications, total } = await listNotificationsForUser({
      schoolId,
      userId: actor.userId,
      role: actor.role,
      page,
      limit,
      unreadOnly,
    });

    res.json({
      notifications,
      pagination: buildPagination(page, limit, total),
    });
  } catch (err) {
    next(err);
  }
};

export const getUnreadNotificationCount = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const actor = requireUser(req);
    const unreadCount = await countUnreadForUser({
      schoolId,
      userId: actor.userId,
      role: actor.role,
    });

    res.json({ unreadCount });
  } catch (err) {
    next(err);
  }
};

export const markNotificationAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const actor = requireUser(req);
    const notificationId = Number(req.params.id);

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      throw new AppError("Invalid notification id", 400);
    }

    const notification = await markNotificationRead({
      schoolId,
      userId: actor.userId,
      role: actor.role,
      notificationId,
    });

    if (!notification) {
      throw new AppError("Notification not found", 404);
    }

    res.json({
      message: "Notification marked as read",
      notification: serializeNotification(notification, { isRead: true }),
    });
  } catch (err) {
    next(err);
  }
};

export const markAllAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const actor = requireUser(req);
    const updated = await markAllNotificationsRead({
      schoolId,
      userId: actor.userId,
      role: actor.role,
    });

    res.json({
      message: "All notifications marked as read",
      updated,
    });
  } catch (err) {
    next(err);
  }
};

export const publishNotice = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const actor = requireUser(req);

    if (!canPublishNotice(actor.role)) {
      throw new AppError("Only admin or school owner can publish notices", 403);
    }

    const title = String(req.body?.title ?? "").trim();
    const body =
      typeof req.body?.body === "string"
        ? req.body.body.trim()
        : typeof req.body?.message === "string"
          ? req.body.message.trim()
          : "";

    if (!title) {
      throw new AppError("title is required", 400);
    }

    const audienceRoles =
      parseAudienceRoles(req.body?.audienceRoles) ??
      [...NOTIFICATION_AUDIENCE_ROLES];

    const notification = await createSchoolNotification({
      schoolId,
      type: "notice",
      title,
      body: body || null,
      sourceType: "notice",
      createdByUserId: actor.userId,
      audienceRoles,
    });

    res.status(201).json({
      message: "Notice published",
      notification: serializeNotification(notification, {
        isRead: false,
      }),
    });
  } catch (err) {
    next(err);
  }
};
