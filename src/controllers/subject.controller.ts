import { NextFunction, Request, Response } from "express";
import Subject from "../models/subject.model";
import { create, list, remove, update } from "../helpers/crud.helpers";
import { AppError } from "../middlewares/error.middleware";
import { buildPagination, getPagination } from "../utils/pagination";

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
