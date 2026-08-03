import { NextFunction, Request, Response } from "express";
import { normalizeRole } from "../utils/roles";
import type { SchoolFeatureKey } from "../utils/school-features";
import {
  isSchoolFeatureEnabled,
  resolveFeatureKeyFromPath,
} from "../services/school-feature.service";

/**
 * Blocks API access when the active school has disabled the feature.
 * Platform admin without school context skips enforcement for catalog browsing.
 */
export const enforceSchoolFeatures = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const featureKey = resolveFeatureKeyFromPath(req.path);
    if (!featureKey) {
      return next();
    }

    const actorRole = normalizeRole((req as any).user?.role);
    const schoolId = Number(req.schoolId);

    // Super admin managing platform with no school selected: allow read paths that
    // still somehow include a feature prefix only if school context exists.
    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      if (actorRole === "admin") {
        return next();
      }
      return res.status(400).json({
        message: "School context is required",
        featureKey,
      });
    }

    const enabled = await isSchoolFeatureEnabled(
      schoolId,
      featureKey as SchoolFeatureKey,
    );

    if (!enabled) {
      return res.status(403).json({
        message: `Feature "${featureKey}" is disabled for this school`,
        featureKey,
        code: "SCHOOL_FEATURE_DISABLED",
      });
    }

    return next();
  } catch (err) {
    next(err);
  }
};

export const requireSchoolFeature =
  (featureKey: SchoolFeatureKey) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schoolId = Number(req.schoolId);
      if (!Number.isInteger(schoolId) || schoolId <= 0) {
        return res.status(400).json({
          message: "School context is required",
          featureKey,
        });
      }

      const enabled = await isSchoolFeatureEnabled(schoolId, featureKey);
      if (!enabled) {
        return res.status(403).json({
          message: `Feature "${featureKey}" is disabled for this school`,
          featureKey,
          code: "SCHOOL_FEATURE_DISABLED",
        });
      }

      return next();
    } catch (err) {
      next(err);
    }
  };
