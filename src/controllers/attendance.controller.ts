import { NextFunction, Request, Response } from "express";
import Attendance from "../models/attendance.model";
import { create, update } from "./crud.helpers";

export const markAttendance = create(Attendance, "attendance");
export const updateAttendance = update(Attendance, "attendance");

export const getAttendanceByClass = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const attendance = await Attendance.findAll({
      where: { classId: req.params.classId },
      order: [["date", "DESC"]],
    });
    res.json({ attendance });
  } catch (err) {
    next(err);
  }
};

export const getAttendanceByStudent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const attendance = await Attendance.findAll({
      where: { studentId: req.params.studentId },
      order: [["date", "DESC"]],
    });
    res.json({ attendance });
  } catch (err) {
    next(err);
  }
};
