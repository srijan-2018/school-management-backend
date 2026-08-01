import { NextFunction, Request, Response } from "express";
import Assignment from "../models/assignment.model";
import AssignmentSubmission from "../models/assignment-submission.model";
import { create, list } from "../helpers/crud.helpers";
import { buildPagination, getPagination } from "../utils/pagination";

export const createAssignment = create(Assignment, "assignment", {
  schoolScoped: true,
});
export const getAssignments = list(Assignment, "assignments", {
  schoolScoped: true,
});
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
        include: [{ model: Assignment }],
        order: [["id", "DESC"]],
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
