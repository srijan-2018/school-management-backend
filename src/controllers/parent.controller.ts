import { NextFunction, Request, Response } from "express";
import Parent from "../models/parent.model";
import ParentStudent from "../models/parent-student.model";
import { list, update } from "../helpers/crud.helpers";

export const getParents = list(Parent, "parents");
export const updateParent = update(Parent, "parent");

export const createParent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { studentIds, ...payload } = req.body ?? {};
    const parent: any = await Parent.create(payload);

    if (Array.isArray(studentIds)) {
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
    const students = await ParentStudent.findAll({
      where: { parentId: req.params.id },
    });
    res.json({ students });
  } catch (err) {
    next(err);
  }
};
