import { NextFunction, Request, Response } from "express";
import Teacher from "../models/teacher.model";
import TeacherClass from "../models/teacher-class.model";
import Timetable from "../models/timetable.model";
import { create, list, remove, update } from "../helpers/crud.helpers";

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
    const classes = await TeacherClass.findAll({
      where: { teacherId: req.params.id },
    });
    res.json({ classes });
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
    const schedule = await Timetable.findAll({
      where: { teacherId: req.params.id },
    });
    res.json({ schedule });
  } catch (err) {
    next(err);
  }
};
