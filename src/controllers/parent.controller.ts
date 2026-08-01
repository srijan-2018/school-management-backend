import { NextFunction, Request, Response } from "express";
import Parent from "../models/parent.model";
import ParentStudent from "../models/parent-student.model";
import User from "../models/user.model";
import Student from "../models/student.model";
import Class from "../models/class.model";
import Section from "../models/section.model";
import { update } from "../helpers/crud.helpers";
import { AppError } from "../middlewares/error.middleware";
import { buildPagination, getPagination } from "../utils/pagination";

const userSafeAttributes = {
  exclude: ["password", "resetPasswordToken", "resetPasswordExpires"],
};

const toOptionalPositiveInteger = (value: unknown, field: string) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${field} must be a positive integer`, 400);
  }

  return parsed;
};

export const getParents = async (
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
    const requestedUserId = toOptionalPositiveInteger(req.query.userId, "userId");
    const where: Record<string, unknown> = {};

    if (requestedUserId) {
      where.userId = requestedUserId;
    }

    const { rows: parents, count } = await Parent.findAndCountAll({
      where,
      include: [
        {
          model: User,
          required: true,
          attributes: userSafeAttributes,
          where: { schoolId },
        },
        {
          model: Student,
          through: { attributes: [] },
          include: [
            {
              model: User,
              attributes: userSafeAttributes,
            },
            {
              model: Class,
              attributes: ["id", "name"],
            },
            {
              model: Section,
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      order: [["id", "DESC"]],
      distinct: true,
      limit,
      offset,
    });

    res.json({
      parents,
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};
export const updateParent = update(Parent, "parent");

export const createParent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { studentIds, ...payload } = req.body ?? {};

    const userId = Number(payload.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: "userId is required" });
    }

    const user: any = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (String(user.role) !== "parent") {
      return res.status(400).json({ message: "User role must be parent" });
    }

    const schoolId = Number(req.schoolId);

    if (
      Number.isInteger(schoolId) &&
      schoolId > 0 &&
      Number(user.schoolId ?? 0) !== schoolId
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const parent: any = await Parent.create(payload);

    if (Array.isArray(studentIds)) {
      if (Number.isInteger(schoolId) && schoolId > 0) {
        const students: any[] = await Student.findAll({
          where: { id: studentIds },
          include: [
            {
              model: User,
              required: true,
              where: { schoolId },
            },
          ],
        });

        if (students.length !== studentIds.length) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      await ParentStudent.bulkCreate(
        studentIds.map((studentId: number) => ({
          parentId: parent.id,
          studentId,
        })),
        { ignoreDuplicates: true },
      );
    }

    res.status(201).json({ message: "parent created successfully", parent });
  } catch (err) {
    next(err);
  }
};

export const getParentStudents = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { rows: students, count } = await ParentStudent.findAndCountAll({
      where: { parentId: req.params.id },
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
