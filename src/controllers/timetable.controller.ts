import { NextFunction, Request, Response } from "express";
import Timetable from "../models/timetable.model";
import { AppError } from "../middlewares/error.middleware";
import { buildPagination, getPagination } from "../utils/pagination";

const normalizeSectionId = (value: unknown) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const sectionId = Number(value);

  if (!Number.isInteger(sectionId) || sectionId <= 0) {
    throw new AppError("sectionId must be a positive integer", 400);
  }

  return sectionId;
};

const normalizeTimetablePayload = (payload: Record<string, unknown>) => {
  const normalizedSectionId = normalizeSectionId(payload.sectionId);

  if (normalizedSectionId === undefined) {
    return payload;
  }

  return {
    ...payload,
    sectionId: normalizedSectionId,
  };
};

export const createTimetable = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (Array.isArray(req.body)) {
      if (req.body.length === 0) {
        return res
          .status(400)
          .json({ message: "timetables payload cannot be empty" });
      }

      const timetables = await Timetable.bulkCreate(
        req.body.map((payload) =>
          normalizeTimetablePayload((payload ?? {}) as Record<string, unknown>),
        ),
        { validate: true },
      );

      return res.status(201).json({
        message: "timetables created successfully",
        timetables,
      });
    }

    const timetable = await Timetable.create(
      normalizeTimetablePayload((req.body ?? {}) as Record<string, unknown>),
    );

    res.status(201).json({
      message: "timetable created successfully",
      timetable,
    });
  } catch (err) {
    next(err);
  }
};

export const updateTimetable = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const timetable: any = await Timetable.findByPk(String(req.params.id));

    if (!timetable) {
      return res.status(404).json({ message: "timetable not found" });
    }

    await timetable.update(
      normalizeTimetablePayload((req.body ?? {}) as Record<string, unknown>),
    );

    res.json({
      message: "timetable updated successfully",
      timetable,
    });
  } catch (err) {
    next(err);
  }
};

export const getTimetableByClass = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { rows: timetable, count } = await Timetable.findAndCountAll({
      where: { classId: req.params.id },
      limit,
      offset,
    });
    res.json({
      timetable,
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};
