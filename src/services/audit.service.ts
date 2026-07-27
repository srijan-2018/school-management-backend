import { Op, fn, col, literal, WhereOptions } from "sequelize";

import AuditLog from "../models/audit-log.model";
import User from "../models/user.model";

const SENSITIVE_KEYS = new Set([
  "password",
  "currentpassword",
  "newpassword",
  "confirmpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "resettoken",
  "resetpasswordtoken",
  "authorization",
]);

export type WriteAuditInput = {
  actorUserId?: number | null;
  actorRole?: string | null;
  actorSchoolId?: number | null;
  actorEmail?: string | null;
  actorName?: string | null;
  module: string;
  action: string;
  method: string;
  path: string;
  resourceType?: string | null;
  resourceId?: string | number | null;
  statusCode: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown> | null;
  durationMs?: number | null;
};

export function redactSensitiveData(value: unknown, depth = 0): unknown {
  if (depth > 4 || value == null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redactSensitiveData(item, depth + 1));
  }

  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase().replace(/[_-]/g, ""))) {
        output[key] = "[REDACTED]";
      } else {
        output[key] = redactSensitiveData(entry, depth + 1);
      }
    }
    return output;
  }

  if (typeof value === "string" && value.length > 500) {
    return `${value.slice(0, 500)}…`;
  }

  return value;
}

export function deriveAuditTarget(method: string, originalUrl: string) {
  const pathOnly = originalUrl.split("?")[0] || "/";
  const segments = pathOnly.replace(/^\/api/, "").split("/").filter(Boolean);
  const moduleName = segments[0] || "system";
  const maybeId = segments[1];
  const resourceId =
    maybeId && /^\d+$/.test(maybeId) ? maybeId : segments[2] && /^\d+$/.test(segments[2]) ? segments[2] : null;

  if (moduleName === "auth") {
    return {
      module: "auth",
      action: (segments[1] || "request").replace(/-/g, "_"),
      resourceType: "auth",
      resourceId: null as string | null,
    };
  }

  const actionByMethod: Record<string, string> = {
    POST: "create",
    PUT: "update",
    PATCH: "update",
    DELETE: "delete",
  };

  let action = actionByMethod[method.toUpperCase()] || method.toLowerCase();
  if (segments.length >= 2 && !/^\d+$/.test(segments[1])) {
    action = segments[1].replace(/-/g, "_");
  }

  return {
    module: moduleName,
    action,
    resourceType: moduleName,
    resourceId,
  };
}

export async function writeAuditLog(input: WriteAuditInput) {
  try {
    const success = input.statusCode >= 200 && input.statusCode < 400;

    await AuditLog.create({
      actorUserId: input.actorUserId ?? null,
      actorRole: input.actorRole ?? null,
      actorSchoolId: input.actorSchoolId ?? null,
      actorEmail: input.actorEmail ?? null,
      actorName: input.actorName ?? null,
      module: input.module.slice(0, 64),
      action: input.action.slice(0, 64),
      method: input.method.toUpperCase().slice(0, 16),
      path: input.path.slice(0, 512),
      resourceType: input.resourceType ? String(input.resourceType).slice(0, 64) : null,
      resourceId:
        input.resourceId === null || input.resourceId === undefined
          ? null
          : String(input.resourceId).slice(0, 64),
      statusCode: input.statusCode,
      success,
      ipAddress: input.ipAddress ? String(input.ipAddress).slice(0, 64) : null,
      userAgent: input.userAgent ? String(input.userAgent).slice(0, 512) : null,
      summary: input.summary ? String(input.summary).slice(0, 512) : null,
      metadata: input.metadata
        ? (redactSensitiveData(input.metadata) as Record<string, unknown>)
        : null,
      durationMs: input.durationMs ?? null,
    });
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}

export type AuditListQuery = {
  page?: number;
  limit?: number;
  module?: string;
  action?: string;
  success?: boolean;
  actorUserId?: number;
  search?: string;
  from?: string;
  to?: string;
};

function buildWhere(query: AuditListQuery): WhereOptions {
  const where: WhereOptions = {};

  if (query.module) {
    where.module = query.module;
  }
  if (query.action) {
    where.action = query.action;
  }
  if (typeof query.success === "boolean") {
    where.success = query.success;
  }
  if (query.actorUserId) {
    where.actorUserId = query.actorUserId;
  }

  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from ? { [Op.gte]: new Date(query.from) } : {}),
      ...(query.to ? { [Op.lte]: new Date(query.to) } : {}),
    };
  }

  if (query.search?.trim()) {
    const term = `%${query.search.trim()}%`;
    Object.assign(where, {
      [Op.or]: [
        { summary: { [Op.like]: term } },
        { path: { [Op.like]: term } },
        { actorEmail: { [Op.like]: term } },
        { actorName: { [Op.like]: term } },
        { module: { [Op.like]: term } },
        { action: { [Op.like]: term } },
      ],
    });
  }

  return where;
}

export async function listAuditLogs(query: AuditListQuery) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const offset = (page - 1) * limit;
  const where = buildWhere(query);

  const { rows, count } = await AuditLog.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  const totalPages = Math.max(1, Math.ceil(count / limit));

  return {
    logs: rows,
    pagination: {
      page,
      limit,
      total: count,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

export async function getAuditAnalytics(days = 14) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const whereSince = { createdAt: { [Op.gte]: since } };

  const [
    totalEvents,
    successCount,
    failureCount,
    uniqueActors,
    byModule,
    byAction,
    byDay,
    topActorsRaw,
    recentFailures,
  ] = await Promise.all([
    AuditLog.count({ where: whereSince }),
    AuditLog.count({ where: { ...whereSince, success: true } }),
    AuditLog.count({ where: { ...whereSince, success: false } }),
    AuditLog.count({
      where: { ...whereSince, actorUserId: { [Op.ne]: null } },
      distinct: true,
      col: "actorUserId",
    }),
    AuditLog.findAll({
      attributes: ["module", [fn("COUNT", col("id")), "count"]],
      where: whereSince,
      group: ["module"],
      order: [[literal("count"), "DESC"]],
      limit: 12,
      raw: true,
    }),
    AuditLog.findAll({
      attributes: ["action", [fn("COUNT", col("id")), "count"]],
      where: whereSince,
      group: ["action"],
      order: [[literal("count"), "DESC"]],
      limit: 12,
      raw: true,
    }),
    AuditLog.findAll({
      attributes: [
        [fn("DATE", col("createdAt")), "date"],
        [fn("COUNT", col("id")), "count"],
      ],
      where: whereSince,
      group: [fn("DATE", col("createdAt"))],
      order: [[fn("DATE", col("createdAt")), "ASC"]],
      raw: true,
    }),
    AuditLog.findAll({
      attributes: [
        "actorUserId",
        "actorName",
        "actorEmail",
        "actorRole",
        [fn("COUNT", col("id")), "count"],
      ],
      where: {
        ...whereSince,
        actorUserId: { [Op.ne]: null },
      },
      group: ["actorUserId", "actorName", "actorEmail", "actorRole"],
      order: [[literal("count"), "DESC"]],
      limit: 8,
      raw: true,
    }),
    AuditLog.findAll({
      where: { ...whereSince, success: false },
      order: [["createdAt", "DESC"]],
      limit: 8,
    }),
  ]);

  const dayMap = new Map<string, number>();
  for (const row of byDay as unknown as Array<{ date: string; count: string | number }>) {
    const key = String(row.date).slice(0, 10);
    dayMap.set(key, Number(row.count) || 0);
  }

  const timeline: Array<{ date: string; count: number }> = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date(since);
    date.setDate(since.getDate() + i);
    const key = date.toISOString().slice(0, 10);
    timeline.push({ date: key, count: dayMap.get(key) || 0 });
  }

  return {
    rangeDays: days,
    totals: {
      totalEvents,
      successCount,
      failureCount,
      uniqueActors,
      successRate:
        totalEvents === 0
          ? 100
          : Math.round((successCount / totalEvents) * 1000) / 10,
    },
    byModule: (
      byModule as unknown as Array<{ module: string; count: string | number }>
    ).map((row) => ({
      module: row.module,
      count: Number(row.count) || 0,
    })),
    byAction: (
      byAction as unknown as Array<{ action: string; count: string | number }>
    ).map((row) => ({
      action: row.action,
      count: Number(row.count) || 0,
    })),
    timeline,
    topActors: (
      topActorsRaw as unknown as Array<{
        actorUserId: number;
        actorName: string | null;
        actorEmail: string | null;
        actorRole: string | null;
        count: string | number;
      }>
    ).map((row) => ({
      userId: row.actorUserId,
      name: row.actorName,
      email: row.actorEmail,
      role: row.actorRole,
      count: Number(row.count) || 0,
    })),
    recentFailures,
  };
}

export async function enrichActorFromUser(userId: number | null | undefined) {
  if (!userId) {
    return null;
  }

  const user = await User.findByPk(userId, {
    attributes: ["id", "name", "email", "role", "schoolId"],
  });

  if (!user) {
    return null;
  }

  return {
    actorUserId: user.id,
    actorName: user.name,
    actorEmail: user.email,
    actorRole: user.role,
    actorSchoolId: user.schoolId ?? null,
  };
}
