import { NextFunction, Request, Response } from "express";
import Mark from "../models/mark.model";
import Exam from "../models/exam.model";
import { create, update } from "../helpers/crud.helpers";
import { buildPagination, getPagination } from "../utils/pagination";

export const createMark = create(Mark, "mark");
export const updateMark = update(Mark, "mark");

export const getMarksByStudent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { rows: marks, count } = await Mark.findAndCountAll({
      where: { studentId: req.params.id },
      include: [{ model: Exam }],
      order: [["id", "DESC"]],
      limit,
      offset,
    });
    res.json({
      marks,
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};
