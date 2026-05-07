import { NextFunction, Request, Response } from "express";
import Assignment from "../models/assignment.model";
import AssignmentSubmission from "../models/assignment-submission.model";
import { create, list } from "./crud.helpers";

export const createAssignment = create(Assignment, "assignment");
export const getAssignments = list(Assignment, "assignments");
export const submitAssignment = create(AssignmentSubmission, "submission");

export const getAssignmentsByStudent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const submissions = await AssignmentSubmission.findAll({
      where: { studentId: req.params.id },
    });
    res.json({ submissions });
  } catch (err) {
    next(err);
  }
};
