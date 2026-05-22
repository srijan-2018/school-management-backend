import { NextFunction, Request, Response } from "express";
import Student from "../models/student.model";
import Attendance from "../models/attendance.model";
import Mark from "../models/mark.model";
import Fee from "../models/fee.model";
import StudentDocument from "../models/student-document.model";
import { create, getById, list, remove, update } from "../helpers/crud.helpers";
import { buildPagination, getPagination } from "../utils/pagination";

export const getStudents = list(Student, "students");
export const createStudent = create(Student, "student");
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
