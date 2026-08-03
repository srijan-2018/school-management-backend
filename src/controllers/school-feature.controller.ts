import { NextFunction, Request, Response } from "express";
import School from "../models/school.model";
import { AppError } from "../middlewares/error.middleware";
import { normalizeRole } from "../utils/roles";
import { SCHOOL_FEATURE_CATALOG } from "../utils/school-features";
import {
  getSchoolFeatureMap,
  setSchoolFeatures,
} from "../services/school-feature.service";

const assertCanAccessSchool = (req: Request, schoolId: number) => {
  const actorRole = normalizeRole((req as any).user?.role);
  const actorSchoolId = Number((req as any).user?.schoolId);

  if (actorRole === "admin") return;

  if (
    !Number.isInteger(actorSchoolId) ||
    actorSchoolId <= 0 ||
    actorSchoolId !== schoolId
  ) {
    throw new AppError("Access denied", 403);
  }
};

export const getFeatureCatalog = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    res.json({ features: SCHOOL_FEATURE_CATALOG });
  } catch (err) {
    next(err);
  }
};

export const getSchoolFeatures = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = Number(req.params.id);
    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      return res.status(400).json({ message: "Invalid school id" });
    }

    assertCanAccessSchool(req, schoolId);

    const school = await School.findByPk(schoolId);
    if (!school) {
      return res.status(404).json({ message: "school not found" });
    }

    const features = await getSchoolFeatureMap(schoolId);
    res.json({ schoolId, features });
  } catch (err) {
    next(err);
  }
};

export const updateSchoolFeatures = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const actorRole = normalizeRole((req as any).user?.role);
    if (actorRole !== "admin") {
      return res.status(403).json({ message: "Only Super Admin can manage school features" });
    }

    const schoolId = Number(req.params.id);
    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      return res.status(400).json({ message: "Invalid school id" });
    }

    const school = await School.findByPk(schoolId);
    if (!school) {
      return res.status(404).json({ message: "school not found" });
    }

    const payload = req.body?.features;
    if (!Array.isArray(payload)) {
      return res.status(400).json({ message: "features must be an array" });
    }

    const features = await setSchoolFeatures(
      schoolId,
      payload.map((item) => ({
        key: String(item?.key ?? item?.featureKey ?? ""),
        enabled: Boolean(item?.enabled),
      })),
    );

    res.json({
      message: "School features updated successfully",
      schoolId,
      features,
    });
  } catch (err) {
    next(err);
  }
};

export const getMySchoolFeatures = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const actorRole = normalizeRole((req as any).user?.role);
    const contextSchoolId = Number(req.schoolId);
    const actorSchoolId = Number((req as any).user?.schoolId);

    const schoolId =
      actorRole === "admin"
        ? contextSchoolId
        : actorSchoolId;

    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      return res.status(400).json({
        message: "School context is required",
      });
    }

    if (actorRole !== "admin") {
      assertCanAccessSchool(req, schoolId);
    }

    const school = await School.findByPk(schoolId);
    if (!school) {
      return res.status(404).json({ message: "school not found" });
    }

    const features = await getSchoolFeatureMap(schoolId);
    res.json({
      schoolId,
      enabledFeatures: features
        .filter((feature) => feature.enabled)
        .map((feature) => feature.key),
      features,
    });
  } catch (err) {
    next(err);
  }
};
