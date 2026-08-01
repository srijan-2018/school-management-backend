import { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import Student from "../models/student.model";
import User from "../models/user.model";
import Attendance from "../models/attendance.model";
import Mark from "../models/mark.model";
import Exam from "../models/exam.model";
import Fee from "../models/fee.model";
import StudentDocument from "../models/student-document.model";
import { getById, remove, update } from "../helpers/crud.helpers";
import { AppError } from "../middlewares/error.middleware";
import { buildPagination, getPagination } from "../utils/pagination";
import { userInclude, userSafeAttributes } from "./user.controller";

const toOptionalPositiveInteger = (value: unknown, field: string) => {
  if (value === undefined || value === null || value === "") return undefined;

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${field} must be a positive integer`, 400);
  }

  return parsed;
};

export const getStudents = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = toOptionalPositiveInteger(req.schoolId, "schoolId");

    if (!schoolId) {
      return res.status(400).json({ message: "School context is required" });
    }

    const { page, limit, offset } = getPagination(req);
    const classId = toOptionalPositiveInteger(req.query.classId, "classId");
    const search = String(req.query.search ?? req.query.keyword ?? "").trim();
    const include = userInclude.map((item: any) => {
      if (item.model !== Student || item.as !== "student") return item;

      return {
        ...item,
        required: true,
        where: classId ? { classId } : undefined,
      };
    });

    const where: Record<string, unknown> = {
      role: "student",
      schoolId,
    };

    if (search) {
      const searchLike = `%${search}%`;

      where[Op.or as unknown as string] = [
        { name: { [Op.like]: searchLike } },
        { email: { [Op.like]: searchLike } },
        { "$student.rollNumber$": { [Op.like]: searchLike } },
      ];
    }

    const { rows: students, count } = await User.findAndCountAll({
      where,
      attributes: userSafeAttributes,
      include,
      order: [["id", "DESC"]],
      distinct: true,
      limit,
      offset,
    });

    res.json({
      students,
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};

export const createStudent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = toOptionalPositiveInteger(req.body?.userId, "userId");

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const user: any = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "student") {
      return res.status(400).json({ message: "User role must be student" });
    }

    const schoolId = toOptionalPositiveInteger(req.schoolId, "schoolId");

    if (schoolId && Number(user.schoolId ?? 0) !== Number(schoolId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const student = await Student.create(req.body ?? {});

    res.status(201).json({ message: "student created successfully", student });
  } catch (err) {
    next(err);
  }
};
export const getStudentById = getById(Student, "student");
export const updateStudent = update(Student, "student");
export const deleteStudent = remove(Student, "student");

export const getStudentAttendance = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { rows: attendance, count } = await Attendance.findAndCountAll({
      where: { studentId: req.params.id },
      order: [["date", "DESC"]],
      limit,
      offset,
    });
    res.json({
      attendance,
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};

export const getStudentResults = async (
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

export const getStudentFees = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { rows: fees, count } = await Fee.findAndCountAll({
      where: { studentId: req.params.id },
      limit,
      offset,
    });
    res.json({
      fees,
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};

export const getStudentDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { rows: documents, count } = await StudentDocument.findAndCountAll({
      where: { studentId: req.params.id },
      limit,
      offset,
    });
    res.json({
      documents,
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};
