import { NextFunction, Request, Response } from "express";
import Student from "../models/student.model";
import Attendance from "../models/attendance.model";
import Mark from "../models/mark.model";
import Fee from "../models/fee.model";
import StudentDocument from "../models/student-document.model";
import { create, getById, list, remove, update } from "../helpers/crud.helpers";

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
    const attendance = await Attendance.findAll({
      where: { studentId: req.params.id },
      order: [["date", "DESC"]],
    });
    res.json({ attendance });
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
    const marks = await Mark.findAll({ where: { studentId: req.params.id } });
    res.json({ marks });
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
    const fees = await Fee.findAll({ where: { studentId: req.params.id } });
    res.json({ fees });
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
    const documents = await StudentDocument.findAll({
      where: { studentId: req.params.id },
    });
    res.json({ documents });
  } catch (err) {
    next(err);
  }
};
