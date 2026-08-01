import { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import Subject from "../models/subject.model";
import Class from "../models/class.model";
import { create, list, remove, update } from "../helpers/crud.helpers";
import { AppError } from "../middlewares/error.middleware";
import { buildPagination, getPagination } from "../utils/pagination";

type SubjectInput = {
  name: string;
  classId: number;
};

const toPositiveInteger = (value: unknown, field: string) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${field} must be a positive integer`, 400);
  }
  return parsed;
};

const normalizeBulkSubjects = (payload: unknown): SubjectInput[] => {
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new AppError("Payload must be a non-empty array of subjects", 400);
  }

  return payload.map((item, index) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const name = String(row.name ?? "").trim();
    if (!name) {
      throw new AppError(`Row ${index + 1}: name is required`, 400);
    }

    return {
      name,
      classId: toPositiveInteger(row.classId, `Row ${index + 1}: classId`),
    };
  });
};

export const bulkCreateSubjects = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = req.schoolId;
    if (!schoolId) {
      throw new AppError("School context is required", 400);
    }

    const normalized = normalizeBulkSubjects(req.body);
    const classIds = Array.from(
      new Set(normalized.map((subject) => subject.classId)),
    );

    const classes = await Class.findAll({
      where: {
        id: { [Op.in]: classIds },
        schoolId,
      },
      attributes: ["id"],
    });

    const existingClassIds = new Set(
      classes.map((classRow: any) => Number(classRow.id)),
    );
    const missingClassIds = classIds.filter(
      (classId) => !existingClassIds.has(classId),
    );

    if (missingClassIds.length > 0) {
      throw new AppError(
        `Class not found for this school: ${missingClassIds.join(", ")}`,
        400,
      );
    }

    const subjects = await Subject.bulkCreate(
      normalized.map((subject) => ({
        name: subject.name,
        classId: subject.classId,
        schoolId,
      })),
      { validate: true },
    );

    return res.status(201).json({
      message:
        subjects.length === 1
          ? "Subject created successfully"
          : `${subjects.length} subjects created successfully`,
      subjects,
    });
  } catch (err) {
    next(err);
  }
};

export const getSubjects = list(Subject, "subjects", { schoolScoped: true });
export const createSubject = create(Subject, "subject", { schoolScoped: true });
export const updateSubject = update(Subject, "subject", { schoolScoped: true });
export const deleteSubject = remove(Subject, "subject", { schoolScoped: true });

export const getSubjectsByClassId = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const classId = Number(req.params.classId);

    if (!Number.isInteger(classId) || classId <= 0) {
      throw new AppError("classId must be a positive integer", 400);
    }

    const { page, limit, offset } = getPagination(req);
    const where: Record<string, unknown> = { classId };
    if (req.schoolId) {
      where.schoolId = req.schoolId;
    }

    const { rows: subjects, count } = await Subject.findAndCountAll({
      where,
      order: [["id", "DESC"]],
      limit,
      offset,
    });

    res.json({
      subjects,
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};
