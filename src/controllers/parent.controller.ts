import { NextFunction, Request, Response } from "express";
import Parent from "../models/parent.model";
import ParentStudent from "../models/parent-student.model";
import User from "../models/user.model";
import Student from "../models/student.model";
import { update } from "../helpers/crud.helpers";
import { buildPagination, getPagination } from "../utils/pagination";
import { normalizeRole } from "../utils/roles";

export const getParents = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const actorRole = normalizeRole((req as any).user?.role);
    const actorSchoolId = Number((req as any).user?.schoolId);

    if (
      actorRole === "school_owner" &&
      (!Number.isInteger(actorSchoolId) || actorSchoolId <= 0)
    ) {
      return res
        .status(400)
        .json({ message: "school_owner is not attached to any school" });
    }

    const { page, limit, offset } = getPagination(req);
    const { rows: parents, count } = await Parent.findAndCountAll({
      include: [
        {
          model: User,
          where:
            actorRole === "school_owner"
              ? { schoolId: actorSchoolId }
              : undefined,
        },
      ],
      order: [["id", "DESC"]],
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

    const actorRole = normalizeRole((req as any).user?.role);
    const actorSchoolId = Number((req as any).user?.schoolId);

    if (actorRole === "school_owner") {
      if (!Number.isInteger(actorSchoolId) || actorSchoolId <= 0) {
        return res
          .status(400)
          .json({ message: "school_owner is not attached to any school" });
      }

      if (Number(user.schoolId ?? 0) !== actorSchoolId) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const parent: any = await Parent.create(payload);

    if (Array.isArray(studentIds)) {
      if (actorRole === "school_owner") {
        const students: any[] = await Student.findAll({
          where: { id: studentIds },
          include: [
            {
              model: User,
              required: true,
              where: { schoolId: actorSchoolId },
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
