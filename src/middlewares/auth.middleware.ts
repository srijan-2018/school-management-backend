import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { UserRole, normalizeRole } from "../utils/roles";
import type { AuthUserPayload } from "../types/express";
import { findActiveSessionById } from "../utils/session";

export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: "JWT_SECRET is not configured" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as AuthUserPayload;

    if (typeof decoded?.id !== "number") {
      return res.status(401).json({ message: "Invalid token" });
    }

    if (typeof decoded.sessionId === "number") {
      const session = await findActiveSessionById(decoded.sessionId, decoded.id);

      if (!session) {
        return res.status(401).json({
          message:
            "Session expired. You have been logged in on another device.",
          code: "SESSION_REVOKED",
        });
      }
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
      schoolId: decoded.schoolId ?? null,
      sessionId: decoded.sessionId ?? null,
    };

    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

export const allowRoles = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const currentRole = normalizeRole(req.user?.role);

    if (!currentRole) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (roles.length && !roles.includes(currentRole)) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  };
};
