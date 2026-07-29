import { NextFunction, Request, Response } from "express";
import Admission from "../models/admission.model";
import LifecycleDocument from "../models/lifecycle-document.model";
import Student from "../models/student.model";
import { requireSchoolId } from "../helpers/school-scope";
import { buildPagination, getPagination } from "../utils/pagination";

export const listAdmissions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const { page, limit, offset } = getPagination(req);
    const { rows, count } = await Admission.findAndCountAll({
      where: { schoolId },
      order: [["id", "DESC"]],
      limit,
      offset,
    });
    res.json({ admissions: rows, pagination: buildPagination(page, limit, count) });
  } catch (err) {
    next(err);
  }
};

export const createAdmission = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const admission = await Admission.create({ ...(req.body ?? {}), schoolId });
    res.status(201).json({ message: "Admission created", admission });
  } catch (err) {
    next(err);
  }
};

export const updateAdmission = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const admission: any = await Admission.findOne({
      where: { id: req.params.id, schoolId },
    });
    if (!admission) return res.status(404).json({ message: "Admission not found" });
    const payload = { ...(req.body ?? {}) };
    delete payload.schoolId;
    await admission.update(payload);
    res.json({ message: "Admission updated", admission });
  } catch (err) {
    next(err);
  }
};

export const enrollAdmission = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const admission: any = await Admission.findOne({
      where: { id: req.params.id, schoolId },
    });
    if (!admission) return res.status(404).json({ message: "Admission not found" });

    const studentId = Number(req.body?.studentId);
    if (!Number.isInteger(studentId) || studentId <= 0) {
      return res.status(400).json({ message: "studentId is required" });
    }

    const student = await Student.findOne({ where: { id: studentId, schoolId } });
    if (!student) {
      return res.status(404).json({ message: "Student not found in this school" });
    }

    await admission.update({
      status: "enrolled",
      enrolledStudentId: studentId,
    });
    res.json({ message: "Admission enrolled", admission });
  } catch (err) {
    next(err);
  }
};

export const promoteStudents = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const { studentIds, toClassId, toSectionId } = req.body ?? {};
    if (!Array.isArray(studentIds) || !studentIds.length || !toClassId) {
      return res
        .status(400)
        .json({ message: "studentIds and toClassId are required" });
    }

    const [count] = await Student.update(
      {
        classId: Number(toClassId),
        ...(toSectionId !== undefined ? { sectionId: Number(toSectionId) || null } : {}),
      },
      {
        where: {
          schoolId,
          id: studentIds.map(Number),
        },
      },
    );

    res.json({ message: "Students promoted", updated: count });
  } catch (err) {
    next(err);
  }
};

export const listDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const { page, limit, offset } = getPagination(req);
    const { rows, count } = await LifecycleDocument.findAndCountAll({
      where: { schoolId },
      order: [["id", "DESC"]],
      limit,
      offset,
    });
    res.json({ documents: rows, pagination: buildPagination(page, limit, count) });
  } catch (err) {
    next(err);
  }
};

export const createDocument = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const document = await LifecycleDocument.create({
      ...(req.body ?? {}),
      schoolId,
    });
    res.status(201).json({ message: "Document created", document });
  } catch (err) {
    next(err);
  }
};
