import { NextFunction, Request, Response } from "express";

import { requireSchoolId } from "../helpers/school-scope";
import { AppError } from "../middlewares/error.middleware";
import {
  getTeacherForSubject,
  sendChatMessage,
  getConversation,
  markMessagesRead,
  getUnreadChatCount,
  listChatSubjects,
  listChatStudents,
  getSubjectUnreadCount,
  markAllChatMessagesRead,
  markMessagesReadWithCounts,
  markSubjectMessagesReadWithCounts,
} from "../services/chat.service";
import { buildPagination, getPagination } from "../utils/pagination";
import { normalizeRole } from "../utils/roles";

function requireUser(req: Request) {
  const userId = req.user?.id;
  const role = normalizeRole(req.user?.role);

  if (!userId || !role) {
    throw new AppError("Unauthorized", 401);
  }

  return { userId: Number(userId), role };
}

// ---------------------------------------------------------------------------
// GET /api/chat/subjects — list subjects with active chats
// ---------------------------------------------------------------------------

export const getChatSubjects = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const actor = requireUser(req);
    const subjects = await listChatSubjects({
      userId: actor.userId,
      schoolId,
    });

    res.json({ subjects });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/chat/subject/:subjectId/teacher — get teacher for a subject
// ---------------------------------------------------------------------------

export const getSubjectTeacher = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const subjectId = Number(req.params.subjectId);
    if (!Number.isInteger(subjectId) || subjectId <= 0) {
      throw new AppError("Invalid subject id", 400);
    }

    const teacher = await getTeacherForSubject(subjectId, schoolId);

    if (!teacher) {
      return res.json({ teacher: null, message: "No teacher assigned to this subject" });
    }

    res.json({ teacher });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/chat/subject/:subjectId/students — students who chatted (for teacher)
// ---------------------------------------------------------------------------

export const getChatStudents = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const actor = requireUser(req);
    const subjectId = Number(req.params.subjectId);

    if (!Number.isInteger(subjectId) || subjectId <= 0) {
      throw new AppError("Invalid subject id", 400);
    }

    const students = await listChatStudents({
      teacherUserId: actor.userId,
      subjectId,
      schoolId,
    });

    res.json({ students });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/chat/subject/:subjectId/messages?with=:userId — conversation
// ---------------------------------------------------------------------------

export const getChatMessages = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const actor = requireUser(req);
    const subjectId = Number(req.params.subjectId);
    const withUserId = Number(req.query.with);

    if (!Number.isInteger(subjectId) || subjectId <= 0) {
      throw new AppError("Invalid subject id", 400);
    }
    if (!Number.isInteger(withUserId) || withUserId <= 0) {
      throw new AppError("Query parameter 'with' (user id) is required", 400);
    }

    const { page, limit } = getPagination(req);

    const { messages, total } = await getConversation({
      schoolId,
      subjectId,
      userAId: actor.userId,
      userBId: withUserId,
      page,
      limit,
    });

    // Reading a conversation acknowledges messages received from the other
    // participant. Keeping this on the read endpoint makes the unread badge
    // reliable even if the app is closed before its follow-up request runs.
    // A student's subject thread can contain replies from more than one
    // teacher, so opening it acknowledges every inbound message in the subject.
    const readResult =
      actor.role === "student"
        ? await markSubjectMessagesReadWithCounts({
            schoolId,
            subjectId,
            receiverUserId: actor.userId,
          })
        : await markMessagesReadWithCounts({
            schoolId,
            subjectId,
            senderUserId: withUserId,
            receiverUserId: actor.userId,
          });

    res.json({
      messages,
      pagination: buildPagination(page, limit, total),
      ...readResult,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/chat/subject/:subjectId/messages — send a message
// ---------------------------------------------------------------------------

export const sendMessage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const actor = requireUser(req);
    const subjectId = Number(req.params.subjectId);

    if (!Number.isInteger(subjectId) || subjectId <= 0) {
      throw new AppError("Invalid subject id", 400);
    }

    const receiverUserId = Number(req.body?.receiverUserId);
    const message = String(req.body?.message ?? "").trim();

    if (!Number.isInteger(receiverUserId) || receiverUserId <= 0) {
      throw new AppError("receiverUserId is required", 400);
    }
    if (!message) {
      throw new AppError("message is required", 400);
    }
    if (receiverUserId === actor.userId) {
      throw new AppError("Cannot send a message to yourself", 400);
    }

    const chatMessage = await sendChatMessage({
      schoolId,
      subjectId,
      senderUserId: actor.userId,
      receiverUserId,
      message,
    });

    // A reply acknowledges every unread message in this conversation. This
    // keeps the unread badge correct even if the client was opened offline or
    // is closed before its separate mark-as-read request completes.
    await markMessagesRead({
      schoolId,
      subjectId,
      senderUserId: receiverUserId,
      receiverUserId: actor.userId,
    });

    res.status(201).json({
      message: "Message sent",
      chatMessage,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/chat/subject/:subjectId/read?from=:userId — mark as read
// ---------------------------------------------------------------------------

export const markAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const actor = requireUser(req);
    const subjectId = Number(req.params.subjectId);
    const fromUserId = Number(req.query.from);

    if (!Number.isInteger(subjectId) || subjectId <= 0) {
      throw new AppError("Invalid subject id", 400);
    }
    const hasFrom = req.query.from != null && req.query.from !== "";
    if (hasFrom && (!Number.isInteger(fromUserId) || fromUserId <= 0)) {
      throw new AppError("Query parameter 'from' must be a user id", 400);
    }

    const readResult = hasFrom
      ? await markMessagesReadWithCounts({
          schoolId,
          subjectId,
          senderUserId: fromUserId,
          receiverUserId: actor.userId,
        })
      : await markSubjectMessagesReadWithCounts({
          schoolId,
          subjectId,
          receiverUserId: actor.userId,
        });

    res.json({
      message: "Messages marked as read",
      ...readResult,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/chat/read-all — mark all inbound messages read for current user
// ---------------------------------------------------------------------------

export const markAllAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const actor = requireUser(req);
    const updated = await markAllChatMessagesRead({
      userId: actor.userId,
      schoolId,
    });
    const unreadCount = await getUnreadChatCount({
      userId: actor.userId,
      schoolId,
    });

    res.json({
      message: "All messages marked as read",
      updated: Math.max(0, Number(updated) || 0),
      unreadCount: Math.max(0, Number(unreadCount) || 0),
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/chat/unread-count — total unread count for badge
// ---------------------------------------------------------------------------

export const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const actor = requireUser(req);
    const count = await getUnreadChatCount({
      userId: actor.userId,
      schoolId,
    });

    res.json({ unreadCount: Math.max(0, Number(count) || 0) });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/chat/subject/:subjectId/unread-count — per-subject unread count
// ---------------------------------------------------------------------------

export const getSubjectUnread = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const actor = requireUser(req);
    const subjectId = Number(req.params.subjectId);

    if (!Number.isInteger(subjectId) || subjectId <= 0) {
      throw new AppError("Invalid subject id", 400);
    }

    const count = await getSubjectUnreadCount({
      subjectId,
      userId: actor.userId,
      schoolId,
    });

    res.json({ unreadCount: Math.max(0, Number(count) || 0) });
  } catch (err) {
    next(err);
  }
};
