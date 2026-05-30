import { NextFunction, Request, Response } from "express";
import Subject from "../models/subject.model";
import { create, list, remove, update } from "../helpers/crud.helpers";
import { AppError } from "../middlewares/error.middleware";
import { buildPagination, getPagination } from "../utils/pagination";

// Bulk create subjects
export const bulkCreateSubjects = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const payload = req.body;
    if (!Array.isArray(payload) || payload.length === 0) {
      return res.status(400).json({ message: "Payload must be a non-empty array of subjects" });
    }
    // Basic validation for each subject
    for (const subject of payload) {
      if (!subject.name || !subject.classId) {
        return res.status(400).json({ message: "Each subject must have a name and classId" });
      }
    }
    const subjects = await Subject.bulkCreate(payload, { validate: true });
    return res.status(201).json({
      message: "Subjects created successfully",
      subjects,
    });
  } catch (err) {
    next(err);
  }
};

export const getSubjects = list(Subject, "subjects");
export const createSubject = create(Subject, "subject");
export const updateSubject = update(Subject, "subject");
export const deleteSubject = remove(Subject, "subject");

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
    const { rows: subjects, count } = await Subject.findAndCountAll({
      where: { classId },
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
