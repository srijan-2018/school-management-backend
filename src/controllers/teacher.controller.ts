import { NextFunction, Request, Response } from "express";
import Teacher from "../models/teacher.model";
import TeacherClass from "../models/teacher-class.model";
import Timetable from "../models/timetable.model";
import { create, list, remove, update } from "../helpers/crud.helpers";
import { buildPagination, getPagination } from "../utils/pagination";

export const getTeachers = list(Teacher, "teachers");
export const createTeacher = create(Teacher, "teacher");
export const updateTeacher = update(Teacher, "teacher");
export const deleteTeacher = remove(Teacher, "teacher");

export const getTeacherClasses = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { rows: classes, count } = await TeacherClass.findAndCountAll({
      where: { teacherId: req.params.id },
      limit,
      offset,
    });
    res.json({
      classes,
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};

export const getTeacherSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { rows: schedule, count } = await Timetable.findAndCountAll({
      where: { teacherId: req.params.id },
      limit,
      offset,
    });
    res.json({
      schedule,
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};
