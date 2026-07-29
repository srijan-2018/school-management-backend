import { NextFunction, Request, Response } from "express";
import StaffProfile from "../models/staff-profile.model";
import LeaveRequest from "../models/leave-request.model";
import SalaryStructure from "../models/salary-structure.model";
import PayrollRun from "../models/payroll-run.model";
import User from "../models/user.model";
import { requireSchoolId } from "../helpers/school-scope";
import { buildPagination, getPagination } from "../utils/pagination";
import { userSafeAttributes } from "./user.controller";

export const listStaffProfiles = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const { page, limit, offset } = getPagination(req);
    const { rows, count } = await StaffProfile.findAndCountAll({
      where: { schoolId },
      include: [{ model: User, attributes: userSafeAttributes }],
      order: [["id", "DESC"]],
      limit,
      offset,
    });
    res.json({ staff: rows, pagination: buildPagination(page, limit, count) });
  } catch (err) {
    next(err);
  }
};

export const createStaffProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const staff = await StaffProfile.create({ ...(req.body ?? {}), schoolId });
    res.status(201).json({ message: "Staff profile created", staff });
  } catch (err) {
    next(err);
  }
};

export const updateStaffProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const staff: any = await StaffProfile.findOne({
      where: { id: req.params.id, schoolId },
    });
    if (!staff) return res.status(404).json({ message: "Staff profile not found" });
    const payload = { ...(req.body ?? {}) };
    delete payload.schoolId;
    await staff.update(payload);
    res.json({ message: "Staff profile updated", staff });
  } catch (err) {
    next(err);
  }
};

export const listLeaves = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const { page, limit, offset } = getPagination(req);
    const { rows, count } = await LeaveRequest.findAndCountAll({
      where: { schoolId },
      include: [{ model: User, attributes: userSafeAttributes }],
      order: [["id", "DESC"]],
      limit,
      offset,
    });
    res.json({ leaves: rows, pagination: buildPagination(page, limit, count) });
  } catch (err) {
    next(err);
  }
};

export const createLeave = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const leave = await LeaveRequest.create({
      ...(req.body ?? {}),
      schoolId,
      userId: req.body?.userId ?? req.user?.id,
      status: "pending",
    });
    res.status(201).json({ message: "Leave request created", leave });
  } catch (err) {
    next(err);
  }
};

export const updateLeave = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const leave: any = await LeaveRequest.findOne({
      where: { id: req.params.id, schoolId },
    });
    if (!leave) return res.status(404).json({ message: "Leave not found" });
    const payload = { ...(req.body ?? {}) };
    delete payload.schoolId;
    await leave.update(payload);
    res.json({ message: "Leave updated", leave });
  } catch (err) {
    next(err);
  }
};

export const listSalaryStructures = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const { page, limit, offset } = getPagination(req);
    const { rows, count } = await SalaryStructure.findAndCountAll({
      where: { schoolId },
      order: [["id", "DESC"]],
      limit,
      offset,
    });
    res.json({
      salaryStructures: rows,
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};

export const createSalaryStructure = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const salaryStructure = await SalaryStructure.create({
      ...(req.body ?? {}),
      schoolId,
    });
    res
      .status(201)
      .json({ message: "Salary structure created", salaryStructure });
  } catch (err) {
    next(err);
  }
};

export const listPayrollRuns = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const { page, limit, offset } = getPagination(req);
    const { rows, count } = await PayrollRun.findAndCountAll({
      where: { schoolId },
      order: [["id", "DESC"]],
      limit,
      offset,
    });
    res.json({
      payrollRuns: rows,
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};

export const createPayrollRun = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const { month, year } = req.body ?? {};
    if (!month || !year) {
      return res.status(400).json({ message: "month and year are required" });
    }

    const staff = await StaffProfile.findAll({
      where: { schoolId, status: "active" },
    });
    const structures = await SalaryStructure.findAll({ where: { schoolId } });
    const structureMap = new Map(
      structures.map((row: any) => [Number(row.staffProfileId), row]),
    );

    const payslips = staff.map((profile: any) => {
      const structure: any = structureMap.get(Number(profile.id));
      const basic = Number(structure?.basic ?? profile.salary ?? 0);
      const hra = Number(structure?.hra ?? 0);
      const allowances = Number(structure?.allowances ?? 0);
      const deductions = Number(structure?.deductions ?? 0);
      const net = basic + hra + allowances - deductions;
      return {
        staffProfileId: profile.id,
        userId: profile.userId,
        basic,
        hra,
        allowances,
        deductions,
        net,
      };
    });

    const totalAmount = payslips.reduce(
      (sum: number, slip: { net: number }) => sum + slip.net,
      0,
    );

    const payrollRun = await PayrollRun.create({
      schoolId,
      month: Number(month),
      year: Number(year),
      status: req.body?.status ?? "processed",
      totalAmount,
      notes: req.body?.notes ?? null,
      payslips,
    });

    res.status(201).json({ message: "Payroll run created", payrollRun });
  } catch (err) {
    next(err);
  }
};
