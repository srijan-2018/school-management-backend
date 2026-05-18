import { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import Section from "../models/section.model";
import Class from "../models/class.model";
import { getById, list, remove } from "../helpers/crud.helpers";
import { AppError } from "../middlewares/error.middleware";

export const getSections = list(Section, "sections");
export const getSectionById = getById(Section, "section");
export const deleteSection = remove(Section, "section");

const toOptionalClassId = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return Number(value);
};

const toClassId = (value: unknown) => {
  const classId = Number(value);

  if (!Number.isInteger(classId) || classId <= 0) {
    throw new AppError("classId must be a valid class id", 400);
  }

  return classId;
};

const getPayloadClassId = (
  payload: Record<string, unknown>,
  fallbackClassId?: number,
) => {
  const nestedClassId =
    payload.class && typeof payload.class === "object"
      ? toOptionalClassId((payload.class as Record<string, unknown>).id)
      : undefined;
  const requestedClassId =
    toOptionalClassId(payload.classId) ?? nestedClassId ?? fallbackClassId;

  if (requestedClassId === undefined) {
    return undefined;
  }

  return toClassId(requestedClassId);
};

const getRequestClassId = (req: Request) => {
  const params = req.params as Record<string, unknown>;
  const query = req.query as Record<string, unknown>;

  return toOptionalClassId(params.classId) ?? toOptionalClassId(query.classId);
};

const normalizeSectionPayload = (
  payload: Record<string, unknown>,
  fallbackClassId?: number,
) => {
  if (!payload.name || !String(payload.name).trim()) {
    throw new AppError("name is required", 400);
  }

  const classId = getPayloadClassId(payload, fallbackClassId);

  return {
    ...payload,
    name: String(payload.name).trim(),
    ...(classId !== undefined ? { classId } : { classId: null }),
  };
};

const validateClassIds = async (
  payloads: Array<Record<string, unknown>>,
  fallbackClassId?: number,
) => {
  const classIds = [
    ...new Set(
      payloads
        .map((payload) => getPayloadClassId(payload, fallbackClassId))
        .filter((classId): classId is number => classId !== undefined),
    ),
  ];

  if (classIds.length === 0) {
    return;
  }

  const classes = await Class.findAll({
    where: { id: { [Op.in]: classIds } },
    attributes: ["id"],
  });
  const existingIds = new Set(
    classes.map((classRow: any) => Number(classRow.id)),
  );
  const missingIds = classIds.filter((classId) => !existingIds.has(classId));

  if (missingIds.length > 0) {
    throw new AppError(`Class not found: ${missingIds.join(", ")}`, 400);
  }
};

export const createSection = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const payload = req.body ?? {};
    const fallbackClassId = getRequestClassId(req);

    if (Array.isArray(payload)) {
      if (payload.length === 0) {
        return res
          .status(400)
          .json({ message: "sections payload cannot be empty" });
      }

      await validateClassIds(payload, fallbackClassId);

      const sections = await Section.bulkCreate(
        payload.map((sectionPayload) =>
          normalizeSectionPayload(sectionPayload, fallbackClassId),
        ),
        { validate: true },
      );

      return res.status(201).json({
        message: "sections created successfully",
        sections,
      });
    }

    await validateClassIds([payload], fallbackClassId);

    const section = await Section.create(
      normalizeSectionPayload(payload, fallbackClassId),
    );

    return res.status(201).json({
      message: "section created successfully",
      section,
    });
  } catch (err) {
    next(err);
  }
};

export const updateSection = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const section = await Section.findByPk(String(req.params.id));

    if (!section) {
      return res.status(404).json({ message: "section not found" });
    }

    const payload = req.body ?? {};

    if (payload.classId !== undefined) {
      await validateClassIds([payload]);
    }

    if (payload.name !== undefined && !String(payload.name).trim()) {
      throw new AppError("name cannot be empty", 400);
    }

    await section.update({
      ...payload,
      ...(payload.name !== undefined
        ? { name: String(payload.name).trim() }
        : {}),
      ...(payload.classId !== undefined
        ? { classId: toClassId(payload.classId) }
        : {}),
    });

    return res.json({
      message: "section updated successfully",
      section,
    });
  } catch (err) {
    next(err);
  }
};
