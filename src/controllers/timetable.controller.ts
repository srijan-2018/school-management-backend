import { NextFunction, Request, Response } from "express";
import Timetable from "../models/timetable.model";
import { create, update } from "../helpers/crud.helpers";

export const createTimetable = create(Timetable, "timetable");
export const updateTimetable = update(Timetable, "timetable");

export const getTimetableByClass = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const timetable = await Timetable.findAll({
      where: { classId: req.params.id },
    });
    res.json({ timetable });
  } catch (err) {
    next(err);
  }
};
