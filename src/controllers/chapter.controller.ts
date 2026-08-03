import { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";

import { AppError } from "../middlewares/error.middleware";
import Chapter from "../models/chapter.model";
import Class from "../models/class.model";
import Subject from "../models/subject.model";
import { buildPagination, getPagination } from "../utils/pagination";

const toPositiveInteger = (value: unknown, field: string) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${field} must be a positive integer`, 400);
  }

  return parsed;
};

const toOptionalString = (value: unknown) => {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
};

const requireSchoolId = (req: Request) => {
  const schoolId = Number(req.schoolId);
  if (!Number.isInteger(schoolId) || schoolId <= 0) {
    throw new AppError("School context is required", 400);
  }
  return schoolId;
};

export const getChapters = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const subjectId = req.query.subjectId
      ? toPositiveInteger(req.query.subjectId, "subjectId")
      : undefined;
    const classId = req.query.classId
      ? toPositiveInteger(req.query.classId, "classId")
      : undefined;

    const where: Record<string, unknown> = {};
    if (subjectId) where.subjectId = subjectId;
    if (req.schoolId) where.schoolId = req.schoolId;

    const subjectWhere: Record<string, unknown> = {};
    if (classId) subjectWhere.classId = classId;

    const { rows: chapters, count } = await Chapter.findAndCountAll({
      where,
      include: [
        {
          model: Subject,
          as: "subject",
          attributes: ["id", "name", "classId"],
          ...(Object.keys(subjectWhere).length > 0
            ? { where: subjectWhere, required: true }
            : {}),
          include: [
            {
              model: Class,
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      order: [
        ["sortOrder", "ASC"],
        ["id", "ASC"],
      ],
      limit,
      offset,
      distinct: true,
    });

    res.json({
      chapters,
      pagination: buildPagination(page, limit, count),
    });
  } catch (error) {
    next(error);
  }
};

export const getChaptersBySubjectId = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req);
    const subjectId = toPositiveInteger(req.params.subjectId, "subjectId");
    const subject = await Subject.findOne({
      where: { id: subjectId, schoolId },
    });

    if (!subject) {
      throw new AppError("Subject not found", 404);
    }

    const { page, limit, offset } = getPagination(req);
    const { rows: chapters, count } = await Chapter.findAndCountAll({
      where: { subjectId, schoolId },
      order: [
        ["sortOrder", "ASC"],
        ["id", "ASC"],
      ],
      limit,
      offset,
    });

    res.json({
      subject: {
        id: subject.id,
        name: subject.name,
        classId: subject.classId,
      },
      chapters,
      pagination: buildPagination(page, limit, count),
    });
  } catch (error) {
    next(error);
  }
};

export const createChapter = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req);
    const subjectId = toPositiveInteger(req.body?.subjectId, "subjectId");
    const name = toOptionalString(req.body?.name);

    if (!name) {
      throw new AppError("Chapter name is required", 400);
    }

    const subject = await Subject.findOne({
      where: { id: subjectId, schoolId },
    });
    if (!subject) {
      throw new AppError("Subject not found", 404);
    }

    const description = toOptionalString(req.body?.description);
    const sortOrderRaw = req.body?.sortOrder;
    const sortOrder =
      sortOrderRaw === undefined || sortOrderRaw === null || sortOrderRaw === ""
        ? 0
        : Number(sortOrderRaw);

    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      throw new AppError("sortOrder must be a non-negative integer", 400);
    }

    const chapter = await Chapter.create({
      name,
      description,
      subjectId,
      sortOrder,
      schoolId,
    });

    res.status(201).json({
      message: "Chapter created successfully",
      chapter,
    });
  } catch (error) {
    next(error);
  }
};

export const bulkCreateChapters = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req);
    const payload = req.body;

    if (!Array.isArray(payload) || payload.length === 0) {
      throw new AppError(
        "Payload must be a non-empty array of chapters",
        400,
      );
    }

    const normalized = payload.map((item, index) => {
      const subjectId = toPositiveInteger(item?.subjectId, "subjectId");
      const name = toOptionalString(item?.name);

      if (!name) {
        throw new AppError(
          `Chapter name is required for item at index ${index}`,
          400,
        );
      }

      const description = toOptionalString(item?.description);
      const sortOrderRaw = item?.sortOrder;
      const sortOrder =
        sortOrderRaw === undefined ||
        sortOrderRaw === null ||
        sortOrderRaw === ""
          ? index
          : Number(sortOrderRaw);

      if (!Number.isInteger(sortOrder) || sortOrder < 0) {
        throw new AppError(
          `sortOrder must be a non-negative integer for item at index ${index}`,
          400,
        );
      }

      return {
        name,
        description,
        subjectId,
        sortOrder,
        schoolId,
      };
    });

    const subjectIds = Array.from(
      new Set(normalized.map((chapter) => chapter.subjectId)),
    );

    const subjects = await Subject.findAll({
      where: { id: subjectIds, schoolId },
      attributes: ["id"],
    });

    if (subjects.length !== subjectIds.length) {
      throw new AppError("One or more subjects were not found", 404);
    }

    const chapters = await Chapter.bulkCreate(normalized, { validate: true });

    res.status(201).json({
      message:
        chapters.length === 1
          ? "Chapter created successfully"
          : `${chapters.length} chapters created successfully`,
      chapters,
    });
  } catch (error) {
    next(error);
  }
};

export const updateChapter = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req);
    const chapterId = toPositiveInteger(req.params.id, "id");
    const chapter = await Chapter.findOne({
      where: { id: chapterId, schoolId },
    });

    if (!chapter) {
      throw new AppError("Chapter not found", 404);
    }

    if (req.body?.name !== undefined) {
      const name = toOptionalString(req.body.name);
      if (!name) {
        throw new AppError("Chapter name is required", 400);
      }
      chapter.name = name;
    }

    if (req.body?.description !== undefined) {
      chapter.description = toOptionalString(req.body.description);
    }

    if (req.body?.subjectId !== undefined) {
      const subjectId = toPositiveInteger(req.body.subjectId, "subjectId");
      const subject = await Subject.findOne({
        where: { id: subjectId, schoolId },
      });
      if (!subject) {
        throw new AppError("Subject not found", 404);
      }
      chapter.subjectId = subjectId;
    }

    if (req.body?.sortOrder !== undefined) {
      const sortOrder = Number(req.body.sortOrder);
      if (!Number.isInteger(sortOrder) || sortOrder < 0) {
        throw new AppError("sortOrder must be a non-negative integer", 400);
      }
      chapter.sortOrder = sortOrder;
    }

    await chapter.save();

    res.json({
      message: "Chapter updated successfully",
      chapter,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteChapter = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req);
    const chapterId = toPositiveInteger(req.params.id, "id");
    const chapter = await Chapter.findOne({
      where: { id: chapterId, schoolId },
    });

    if (!chapter) {
      throw new AppError("Chapter not found", 404);
    }

    await chapter.destroy();

    res.json({
      message: "Chapter deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const bulkDeleteChapters = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req);
    const rawIds = req.body?.ids;

    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      throw new AppError("ids must be a non-empty array", 400);
    }

    const ids = Array.from(
      new Set(
        rawIds.map((item: unknown, index: number) =>
          toPositiveInteger(item, `ids[${index}]`),
        ),
      ),
    );

    const chapters = await Chapter.findAll({
      where: { id: { [Op.in]: ids }, schoolId },
      attributes: ["id"],
    });

    if (chapters.length !== ids.length) {
      throw new AppError("One or more chapters were not found", 404);
    }

    await Chapter.destroy({
      where: { id: { [Op.in]: ids }, schoolId },
    });

    res.json({
      message:
        ids.length === 1
          ? "Chapter deleted successfully"
          : `${ids.length} chapters deleted successfully`,
      deleted: ids.length,
    });
  } catch (error) {
    next(error);
  }
};
