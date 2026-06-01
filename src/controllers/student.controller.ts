import { NextFunction, Request, Response } from "express";
import Student from "../models/student.model";
import User from "../models/user.model";
import Attendance from "../models/attendance.model";
import Mark from "../models/mark.model";
import Fee from "../models/fee.model";
import StudentDocument from "../models/student-document.model";
import { getById, remove, update } from "../helpers/crud.helpers";
import { AppError } from "../middlewares/error.middleware";
import { buildPagination, getPagination } from "../utils/pagination";
import { normalizeRole } from "../utils/roles";
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
    const actorRole = normalizeRole((req as any).user?.role);
    const actorSchoolId = toOptionalPositiveInteger(
      (req as any).user?.schoolId,
      "schoolId",
    );

    if (actorRole === "school_owner" && !actorSchoolId) {
      return res
        .status(400)
        .json({ message: "school_owner is not attached to any school" });
    }
    const { page, limit, offset } = getPagination(req);
    const classId = toOptionalPositiveInteger(req.query.classId, "classId");
    const include = userInclude.map((item: any) => {
      if (item.model !== Student || item.as !== "student") return item;

      return {
        ...item,
        required: true,
        where: classId ? { classId } : undefined,
      };
    });

    const { rows: students, count } = await User.findAndCountAll({
      where:
        actorRole === "school_owner"
          ? {
              role: "student",
              schoolId: actorSchoolId,
            }
          : { role: "student" },
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

    const actorRole = normalizeRole((req as any).user?.role);
    const actorSchoolId = toOptionalPositiveInteger(
      (req as any).user?.schoolId,
      "schoolId",
    );

    if (actorRole === "school_owner") {
      if (!actorSchoolId) {
        return res
          .status(400)
          .json({ message: "school_owner is not attached to any school" });
      }

      if (Number(user.schoolId ?? 0) !== Number(actorSchoolId)) {
        return res.status(403).json({ message: "Access denied" });
      }
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
