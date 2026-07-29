import { NextFunction, Request, Response } from "express";
import School from "../models/school.model";
import { normalizeRole } from "../utils/roles";

const parseSchoolId = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const readHeaderSchoolId = (req: Request): number | null => {
  const headerValue = req.headers["x-school-id"];
  if (Array.isArray(headerValue)) {
    return parseSchoolId(headerValue[0]);
  }
  return parseSchoolId(headerValue);
};

/**
 * Resolves trusted school context for the request.
 * - admin: may select via X-School-Id (or ?schoolId=); optional unless requireSchool is true
 * - other roles: locked to JWT schoolId; header must match if provided
 */
export const resolveSchoolContext = (options?: { requireSchool?: boolean }) => {
  const requireSchool = options?.requireSchool ?? false;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = normalizeRole(req.user?.role);
      const jwtSchoolId = parseSchoolId(req.user?.schoolId);
      const headerSchoolId = readHeaderSchoolId(req);
      const querySchoolId = parseSchoolId(req.query.schoolId);

      if (!role) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (role === "admin") {
        const selected = headerSchoolId ?? querySchoolId;

        if (selected !== null) {
          const school = await School.findByPk(selected);
          if (!school) {
            return res.status(404).json({ message: "Selected school not found" });
          }
          req.schoolId = selected;
        } else {
          req.schoolId = null;
        }

        if (requireSchool && !req.schoolId) {
          return res.status(400).json({
            message: "X-School-Id header is required for this operation",
          });
        }

        return next();
      }

      if (!jwtSchoolId) {
        return res.status(400).json({
          message: "User is not attached to any school",
        });
      }

      if (headerSchoolId !== null && headerSchoolId !== jwtSchoolId) {
        return res.status(403).json({
          message: "Cannot operate outside your assigned school",
        });
      }

      if (querySchoolId !== null && querySchoolId !== jwtSchoolId) {
        return res.status(403).json({
          message: "Cannot filter outside your assigned school",
        });
      }

      req.schoolId = jwtSchoolId;
      return next();
    } catch (error) {
      return next(error);
    }
  };
};

export const requireSchoolContext = resolveSchoolContext({ requireSchool: true });
