import { NextFunction, Request, Response } from "express";

import {
  deriveAuditTarget,
  enrichActorFromUser,
  redactSensitiveData,
  writeAuditLog,
} from "../services/audit.service";

const SKIP_PREFIXES = ["/api/audit-logs", "/api-docs", "/"];

function shouldSkip(path: string, method: string) {
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }

  const normalized = path.split("?")[0] || "/";

  if (normalized === "/" || normalized === "/api-docs.json") {
    return true;
  }

  return SKIP_PREFIXES.some(
    (prefix) =>
      prefix !== "/" &&
      (normalized === prefix || normalized.startsWith(`${prefix}/`)),
  );
}

function getClientIp(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || null;
  }
  return req.socket.remoteAddress || null;
}

function buildSummary(
  moduleName: string,
  action: string,
  statusCode: number,
  actorEmail?: string | null,
) {
  const who = actorEmail ? ` by ${actorEmail}` : "";
  const result = statusCode >= 200 && statusCode < 400 ? "succeeded" : "failed";
  return `${moduleName}.${action} ${result}${who}`;
}

/**
 * Records mutating API activity after the response finishes.
 * Safe to mount globally — never blocks the request path.
 */
export function auditRequestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (shouldSkip(req.originalUrl || req.url, req.method)) {
    return next();
  }

  const startedAt = Date.now();

  res.on("finish", () => {
    void (async () => {
      const target = deriveAuditTarget(req.method, req.originalUrl || req.url);
      const authUser = (req as any).user as
        | { id?: number; role?: string; schoolId?: number | null }
        | undefined;

      let actor = {
        actorUserId: authUser?.id ?? null,
        actorRole: authUser?.role ?? null,
        actorSchoolId: authUser?.schoolId ?? null,
        actorEmail: null as string | null,
        actorName: null as string | null,
      };

      if (authUser?.id) {
        const enriched = await enrichActorFromUser(authUser.id);
        if (enriched) {
          actor = enriched;
        }
      } else if (req.body && typeof req.body === "object" && "email" in req.body) {
        actor.actorEmail = String((req.body as { email?: string }).email || "") || null;
      }

      const query = req.query && Object.keys(req.query).length > 0 ? req.query : undefined;
      const body =
        req.body && typeof req.body === "object" && Object.keys(req.body).length > 0
          ? req.body
          : undefined;

      await writeAuditLog({
        ...actor,
        module: target.module,
        action: target.action,
        method: req.method,
        path: (req.originalUrl || req.url).slice(0, 512),
        resourceType: target.resourceType,
        resourceId: target.resourceId,
        statusCode: res.statusCode,
        ipAddress: getClientIp(req),
        userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null,
        summary: buildSummary(
          target.module,
          target.action,
          res.statusCode,
          actor.actorEmail,
        ),
        metadata: redactSensitiveData({
          ...(body ? { body } : {}),
          ...(query ? { query } : {}),
          params: req.params,
        }) as Record<string, unknown>,
        durationMs: Date.now() - startedAt,
      });
    })();
  });

  next();
}
