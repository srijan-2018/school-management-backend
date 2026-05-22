import { NextFunction, Request, Response } from "express";
import Assignment from "../models/assignment.model";
import AssignmentSubmission from "../models/assignment-submission.model";
import { create, list } from "../helpers/crud.helpers";
import { buildPagination, getPagination } from "../utils/pagination";

export const createAssignment = create(Assignment, "assignment");
export const getAssignments = list(Assignment, "assignments");
export const submitAssignment = create(AssignmentSubmission, "submission");

export const getAssignmentsByStudent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { rows: submissions, count } =
      await AssignmentSubmission.findAndCountAll({
        where: { studentId: req.params.id },
        limit,
        offset,
      });
    res.json({
      submissions,
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};
