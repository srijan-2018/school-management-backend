import Notification, {
  type NotificationType,
} from "../models/notification.model";
import NotificationRead from "../models/notification-read.model";
import User from "../models/user.model";
import {
  NOTICE_PUBLISH_ROLES,
  NOTIFICATION_AUDIENCE_ROLES,
  type UserRole,
} from "../utils/roles";

export type CreateNotificationInput = {
  schoolId: number;
  type: NotificationType;
  title: string;
  body?: string | null;
  sourceType?: string | null;
  sourceId?: number | null;
  createdByUserId?: number | null;
  audienceRoles?: UserRole[];
};

function encodeAudienceRoles(roles: UserRole[]) {
  return JSON.stringify(roles);
}

export function decodeAudienceRoles(value: unknown): UserRole[] {
  if (Array.isArray(value)) {
    return value.filter((role): role is UserRole => typeof role === "string");
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((role): role is UserRole => typeof role === "string")
      : [];
  } catch {
    return [];
  }
}

/** Expand legacy staff-only audiences so students/parents can see older alerts. */
function audienceIncludesRole(roles: UserRole[], role: UserRole) {
  if (roles.length === 0) return true;
  if (roles.includes(role)) return true;

  if (role !== "student" && role !== "parent") {
    return false;
  }

  // Older rows were saved with staff-only defaults before learners were added.
  const hasLearner = roles.includes("student") || roles.includes("parent");
  if (hasLearner) return false;

  const staffRoles = new Set([
    "teacher",
    "head_teacher",
    "school_owner",
    "admin",
    "administrator",
  ]);
  return roles.every((item) => staffRoles.has(item));
}

export function canPublishNotice(role?: string | null) {
  return Boolean(
    role && NOTICE_PUBLISH_ROLES.includes(role as UserRole),
  );
}

export async function createSchoolNotification(input: CreateNotificationInput) {
  const audienceRoles =
    input.audienceRoles && input.audienceRoles.length > 0
      ? input.audienceRoles
      : [...NOTIFICATION_AUDIENCE_ROLES];

  const notification = await Notification.create({
    schoolId: input.schoolId,
    type: input.type,
    title: input.title.trim(),
    body: input.body?.trim() || null,
    sourceType: input.sourceType ?? null,
    sourceId: input.sourceId ?? null,
    audienceRoles: encodeAudienceRoles(audienceRoles),
    createdByUserId: input.createdByUserId ?? null,
  });

  return notification;
}

export async function notifyExamPublished(params: {
  schoolId: number;
  examId: number;
  examName: string;
  examDate?: string | null;
  createdByUserId?: number | null;
}) {
  const datePart = params.examDate ? ` on ${params.examDate}` : "";
  return createSchoolNotification({
    schoolId: params.schoolId,
    type: "exam",
    title: `Exam scheduled: ${params.examName}`,
    body: `A new exam "${params.examName}" has been published${datePart}.`,
    sourceType: "exam",
    sourceId: params.examId,
    createdByUserId: params.createdByUserId,
  });
}

export async function notifyExamSchedulePublished(params: {
  schoolId: number;
  scheduleId: number;
  title: string;
  createdByUserId?: number | null;
}) {
  return createSchoolNotification({
    schoolId: params.schoolId,
    type: "exam",
    title: `Exam schedule: ${params.title}`,
    body: `Exam schedule "${params.title}" is now active.`,
    sourceType: "exam_schedule",
    sourceId: params.scheduleId,
    createdByUserId: params.createdByUserId,
  });
}

export async function notifyCalendarPublished(params: {
  schoolId: number;
  calendarId: number;
  title: string;
  type: "holiday" | "event";
  startDate: string;
  endDate?: string | null;
  description?: string | null;
  createdByUserId?: number | null;
}) {
  const range =
    params.endDate && params.endDate !== params.startDate
      ? `${params.startDate} to ${params.endDate}`
      : params.startDate;

  return createSchoolNotification({
    schoolId: params.schoolId,
    type: params.type === "holiday" ? "holiday" : "event",
    title: `${params.type === "holiday" ? "Holiday" : "Event"}: ${params.title}`,
    body:
      params.description?.trim() ||
      `A school ${params.type} "${params.title}" was published for ${range}.`,
    sourceType: "calendar",
    sourceId: params.calendarId,
    createdByUserId: params.createdByUserId,
  });
}

export function serializeNotification(
  notification: Notification,
  options?: { isRead?: boolean; createdByName?: string | null },
) {
  return {
    id: notification.id,
    schoolId: notification.schoolId,
    type: notification.type,
    title: notification.title,
    body: notification.body ?? null,
    sourceType: notification.sourceType ?? null,
    sourceId: notification.sourceId ?? null,
    audienceRoles: decodeAudienceRoles(notification.audienceRoles),
    createdByUserId: notification.createdByUserId ?? null,
    createdByName: options?.createdByName ?? null,
    isRead: Boolean(options?.isRead),
    createdAt: notification.get("createdAt"),
    updatedAt: notification.get("updatedAt"),
  };
}

export async function listNotificationsForUser(params: {
  schoolId: number;
  userId: number;
  role: string;
  page: number;
  limit: number;
  unreadOnly?: boolean;
}) {
  const rows = await Notification.findAll({
    where: { schoolId: params.schoolId },
    include: [
      {
        model: User,
        as: "createdBy",
        attributes: ["id", "name"],
        required: false,
      },
      {
        model: NotificationRead,
        as: "reads",
        where: { userId: params.userId },
        required: false,
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  const filtered = rows.filter((row) => {
    const roles = decodeAudienceRoles(row.audienceRoles);
    return audienceIncludesRole(roles, params.role as UserRole);
  });

  const mapped = filtered.map((row) => {
    const reads = (row as any).reads as NotificationRead[] | undefined;
    const createdBy = (row as any).createdBy as User | undefined;
    const isRead = Boolean(reads && reads.length > 0);
    return serializeNotification(row, {
      isRead,
      createdByName: createdBy?.get("name") as string | undefined,
    });
  });

  const visible = params.unreadOnly
    ? mapped.filter((item) => !item.isRead)
    : mapped;

  const total = visible.length;
  const offset = (params.page - 1) * params.limit;
  const notifications = visible.slice(offset, offset + params.limit);

  return { notifications, total };
}

export async function countUnreadForUser(params: {
  schoolId: number;
  userId: number;
  role: string;
}) {
  const { total } = await listNotificationsForUser({
    ...params,
    page: 1,
    limit: 10_000,
    unreadOnly: true,
  });
  return total;
}

export async function markNotificationRead(params: {
  schoolId: number;
  userId: number;
  role: string;
  notificationId: number;
}) {
  const notification = await Notification.findOne({
    where: {
      id: params.notificationId,
      schoolId: params.schoolId,
    },
  });

  if (!notification) {
    return null;
  }

  const roles = decodeAudienceRoles(notification.audienceRoles);
  if (!audienceIncludesRole(roles, params.role as UserRole)) {
    return null;
  }

  await NotificationRead.findOrCreate({
    where: {
      notificationId: notification.id,
      userId: params.userId,
    },
    defaults: {
      notificationId: notification.id,
      userId: params.userId,
      readAt: new Date(),
    },
  });

  return notification;
}

export async function markAllNotificationsRead(params: {
  schoolId: number;
  userId: number;
  role: string;
}) {
  const { notifications } = await listNotificationsForUser({
    ...params,
    page: 1,
    limit: 10_000,
    unreadOnly: true,
  });

  for (const item of notifications) {
    await NotificationRead.findOrCreate({
      where: {
        notificationId: item.id,
        userId: params.userId,
      },
      defaults: {
        notificationId: item.id,
        userId: params.userId,
        readAt: new Date(),
      },
    });
  }

  return notifications.length;
}
