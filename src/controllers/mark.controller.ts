import { NextFunction, Request, Response } from "express";
import Mark from "../models/mark.model";
import { create, update } from "../helpers/crud.helpers";

export const createMark = create(Mark, "mark");
export const updateMark = update(Mark, "mark");

export const getMarksByStudent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const marks = await Mark.findAll({ where: { studentId: req.params.id } });
    res.json({ marks });
  } catch (err) {
    next(err);
  }
};
