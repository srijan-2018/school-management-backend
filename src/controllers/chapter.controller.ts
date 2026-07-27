import { NextFunction, Request, Response } from "express";

import { AppError } from "../middlewares/error.middleware";
import Chapter from "../models/chapter.model";
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

    const where = subjectId ? { subjectId } : {};
    const { rows: chapters, count } = await Chapter.findAndCountAll({
      where,
      include: [
        {
          model: Subject,
          as: "subject",
          attributes: ["id", "name", "classId"],
        },
      ],
      order: [
        ["sortOrder", "ASC"],
        ["id", "ASC"],
      ],
      limit,
      offset,
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
    const subjectId = toPositiveInteger(req.params.subjectId, "subjectId");
    const subject = await Subject.findByPk(String(subjectId));

    if (!subject) {
      throw new AppError("Subject not found", 404);
    }

    const { page, limit, offset } = getPagination(req);
    const { rows: chapters, count } = await Chapter.findAndCountAll({
      where: { subjectId },
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
    const subjectId = toPositiveInteger(req.body?.subjectId, "subjectId");
    const name = toOptionalString(req.body?.name);

    if (!name) {
      throw new AppError("Chapter name is required", 400);
    }

    const subject = await Subject.findByPk(String(subjectId));
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
    });

    res.status(201).json({
      message: "Chapter created successfully",
      chapter,
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
    const chapterId = toPositiveInteger(req.params.id, "id");
    const chapter = await Chapter.findByPk(String(chapterId));

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
      const subject = await Subject.findByPk(String(subjectId));
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
    const chapterId = toPositiveInteger(req.params.id, "id");
    const chapter = await Chapter.findByPk(String(chapterId));

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
