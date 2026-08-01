import { NextFunction, Request, Response } from "express";
import Teacher from "../models/teacher.model";
import TeacherClass from "../models/teacher-class.model";
import Timetable from "../models/timetable.model";
import User from "../models/user.model";
import { remove, update } from "../helpers/crud.helpers";
import { buildPagination, getPagination } from "../utils/pagination";

const userSafeAttributes = {
  exclude: ["password", "resetPasswordToken", "resetPasswordExpires"],
};

export const getTeachers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = Number(req.schoolId);

    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      return res.status(400).json({ message: "School context is required" });
    }

    const { page, limit, offset } = getPagination(req);
    const { rows: teachers, count } = await Teacher.findAndCountAll({
      include: [
        {
          model: User,
          required: true,
          attributes: userSafeAttributes,
          where: { schoolId },
        },
      ],
      order: [["id", "DESC"]],
      distinct: true,
      limit,
      offset,
    });

    res.json({
      teachers: teachers.map((teacher: any) => {
        const plain =
          typeof teacher.toJSON === "function" ? teacher.toJSON() : teacher;
        const user = plain.User ?? plain.user ?? null;
        return {
          ...plain,
          name: user?.name ?? null,
          email: user?.email ?? null,
          role: user?.role ?? null,
        };
      }),
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};
export const createTeacher = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = Number(req.body?.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: "userId is required" });
    }

    const user: any = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!["teacher", "head_teacher"].includes(String(user.role))) {
      return res
        .status(400)
        .json({ message: "User role must be teacher or head_teacher" });
    }

    const schoolId = Number(req.schoolId);

    if (
      Number.isInteger(schoolId) &&
      schoolId > 0 &&
      Number(user.schoolId ?? 0) !== schoolId
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const teacher = await Teacher.create(req.body ?? {});

    res.status(201).json({ message: "teacher created successfully", teacher });
  } catch (err) {
    next(err);
  }
};
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
