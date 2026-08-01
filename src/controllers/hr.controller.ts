import { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import StaffProfile from "../models/staff-profile.model";
import LeaveRequest from "../models/leave-request.model";
import SalaryStructure from "../models/salary-structure.model";
import PayrollRun from "../models/payroll-run.model";
import SchoolCalendar from "../models/school-calendar.model";
import User from "../models/user.model";
import { requireSchoolId } from "../helpers/school-scope";
import { AppError } from "../middlewares/error.middleware";
import { buildPagination, getPagination } from "../utils/pagination";
import { HR_MANAGER_ROLES, normalizeRole } from "../utils/roles";
import { LEAVE_TYPES, normalizeLeaveType } from "../constants/leave-types";
import { userSafeAttributes } from "./user.controller";

const isHrManager = (role: unknown) => {
  const normalized = normalizeRole(role);
  return Boolean(normalized && HR_MANAGER_ROLES.includes(normalized));
};

const leaveIncludes = [
  { model: User, attributes: userSafeAttributes },
  {
    model: User,
    as: "approver",
    attributes: userSafeAttributes,
    required: false,
  },
];

const toDateOnly = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim().slice(0, 10);
};

const addDays = (dateOnly: string, days: number) => {
  const date = new Date(`${dateOnly}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const todayDateOnly = () => new Date().toISOString().slice(0, 10);

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

export const listLeaveTypes = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    res.json({
      leaveTypes: LEAVE_TYPES.map((type) => ({
        value: type,
        label: type,
      })),
    });
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
    const manager = isHrManager(req.user?.role);
    const mineOnly =
      String(req.query.mine ?? "").toLowerCase() === "1" ||
      String(req.query.mine ?? "").toLowerCase() === "true";
    const status =
      typeof req.query.status === "string" && req.query.status.trim()
        ? req.query.status.trim().toLowerCase()
        : undefined;

    const where: Record<string, unknown> = { schoolId };
    if (!manager || mineOnly) {
      where.userId = req.user?.id;
    }
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      where.status = status;
    }

    const { rows, count } = await LeaveRequest.findAndCountAll({
      where,
      include: leaveIncludes,
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

    const leaveType = normalizeLeaveType(req.body?.leaveType);
    const startDate = toDateOnly(req.body?.startDate);
    const endDate = toDateOnly(req.body?.endDate);
    const reason =
      typeof req.body?.reason === "string" ? req.body.reason.trim() : null;

    if (!leaveType) {
      throw new AppError(
        `leaveType must be one of: ${LEAVE_TYPES.join(", ")}`,
        400,
      );
    }
    if (!startDate || !endDate) {
      throw new AppError("startDate and endDate are required", 400);
    }
    if (endDate < startDate) {
      throw new AppError("endDate must be on or after startDate", 400);
    }

    const manager = isHrManager(req.user?.role);
    const requestedUserId = Number(req.body?.userId);
    const userId =
      manager && Number.isInteger(requestedUserId) && requestedUserId > 0
        ? requestedUserId
        : req.user?.id;

    if (!userId) throw new AppError("Unable to resolve leave requester", 400);

    const leave = await LeaveRequest.create({
      schoolId,
      userId,
      leaveType,
      startDate,
      endDate,
      reason,
      status: "pending",
      approvedBy: null,
      approvedAt: null,
      reviewNote: null,
    });

    const created = await LeaveRequest.findByPk(leave.id, {
      include: leaveIncludes,
    });

    res.status(201).json({ message: "Leave request created", leave: created });
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
    delete payload.status;
    delete payload.approvedBy;
    delete payload.approvedAt;
    delete payload.reviewNote;
    delete payload.userId;

    if (payload.startDate) payload.startDate = toDateOnly(payload.startDate);
    if (payload.endDate) payload.endDate = toDateOnly(payload.endDate);
    if (payload.leaveType != null) {
      const normalized = normalizeLeaveType(payload.leaveType);
      if (!normalized) {
        throw new AppError(
          `leaveType must be one of: ${LEAVE_TYPES.join(", ")}`,
          400,
        );
      }
      payload.leaveType = normalized;
    }

    await leave.update(payload);
    const updated = await LeaveRequest.findByPk(leave.id, {
      include: leaveIncludes,
    });
    res.json({ message: "Leave updated", leave: updated });
  } catch (err) {
    next(err);
  }
};

const reviewLeave = async (
  req: Request,
  res: Response,
  next: NextFunction,
  status: "approved" | "rejected",
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const leave: any = await LeaveRequest.findOne({
      where: { id: req.params.id, schoolId },
    });
    if (!leave) return res.status(404).json({ message: "Leave not found" });
    if (leave.status !== "pending") {
      throw new AppError("Only pending leave requests can be reviewed", 400);
    }

    const reviewNote =
      typeof req.body?.reviewNote === "string"
        ? req.body.reviewNote.trim()
        : null;

    await leave.update({
      status,
      approvedBy: req.user?.id ?? null,
      approvedAt: new Date(),
      reviewNote,
    });

    const updated = await LeaveRequest.findByPk(leave.id, {
      include: leaveIncludes,
    });

    res.json({
      message: status === "approved" ? "Leave approved" : "Leave rejected",
      leave: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const approveLeave = (
  req: Request,
  res: Response,
  next: NextFunction,
) => reviewLeave(req, res, next, "approved");

export const rejectLeave = (
  req: Request,
  res: Response,
  next: NextFunction,
) => reviewLeave(req, res, next, "rejected");

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

export const listCalendarItems = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const { page, limit, offset } = getPagination(req);
    const type =
      typeof req.query.type === "string" && req.query.type.trim()
        ? req.query.type.trim().toLowerCase()
        : undefined;

    const where: Record<string, unknown> = { schoolId };
    if (type && ["holiday", "event"].includes(type)) {
      where.type = type;
    }

    const { rows, count } = await SchoolCalendar.findAndCountAll({
      where,
      order: [["startDate", "ASC"], ["id", "ASC"]],
      limit,
      offset,
    });

    res.json({
      calendarItems: rows,
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};

export const listUpcomingCalendar = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const days = Math.min(
      Math.max(Number(req.query.days) || 60, 1),
      365,
    );
    const today = todayDateOnly();
    const until = addDays(today, days);
    const type =
      typeof req.query.type === "string" && req.query.type.trim()
        ? req.query.type.trim().toLowerCase()
        : undefined;

    const where: Record<string, unknown> = {
      schoolId,
      startDate: { [Op.lte]: until },
      endDate: { [Op.gte]: today },
    };
    if (type && ["holiday", "event"].includes(type)) {
      where.type = type;
    }

    const calendarItems = await SchoolCalendar.findAll({
      where,
      order: [["startDate", "ASC"], ["id", "ASC"]],
      limit: 50,
    });

    res.json({ calendarItems, from: today, until });
  } catch (err) {
    next(err);
  }
};

export const createCalendarItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const title = String(req.body?.title ?? "").trim();
    const type = String(req.body?.type ?? "event").trim().toLowerCase();
    const startDate = toDateOnly(req.body?.startDate);
    const endDate = toDateOnly(req.body?.endDate) ?? startDate;
    const description =
      typeof req.body?.description === "string"
        ? req.body.description.trim()
        : null;

    if (!title) throw new AppError("title is required", 400);
    if (!["holiday", "event"].includes(type)) {
      throw new AppError("type must be holiday or event", 400);
    }
    if (!startDate || !endDate) {
      throw new AppError("startDate is required", 400);
    }
    if (endDate < startDate) {
      throw new AppError("endDate must be on or after startDate", 400);
    }

    const calendarItem = await SchoolCalendar.create({
      schoolId,
      title,
      type,
      startDate,
      endDate,
      description,
      isAllDay: req.body?.isAllDay !== false && req.body?.isAllDay !== "false",
    });

    res.status(201).json({ message: "Calendar item created", calendarItem });
  } catch (err) {
    next(err);
  }
};

export const updateCalendarItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const calendarItem: any = await SchoolCalendar.findOne({
      where: { id: req.params.id, schoolId },
    });
    if (!calendarItem) {
      return res.status(404).json({ message: "Calendar item not found" });
    }

    const payload = { ...(req.body ?? {}) };
    delete payload.schoolId;
    if (payload.title != null) payload.title = String(payload.title).trim();
    if (payload.type != null) {
      payload.type = String(payload.type).trim().toLowerCase();
      if (!["holiday", "event"].includes(payload.type)) {
        throw new AppError("type must be holiday or event", 400);
      }
    }
    if (payload.startDate != null) payload.startDate = toDateOnly(payload.startDate);
    if (payload.endDate != null) payload.endDate = toDateOnly(payload.endDate);

    await calendarItem.update(payload);
    res.json({ message: "Calendar item updated", calendarItem });
  } catch (err) {
    next(err);
  }
};

export const deleteCalendarItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const calendarItem: any = await SchoolCalendar.findOne({
      where: { id: req.params.id, schoolId },
    });
    if (!calendarItem) {
      return res.status(404).json({ message: "Calendar item not found" });
    }

    await calendarItem.destroy();
    res.json({ message: "Calendar item deleted" });
  } catch (err) {
    next(err);
  }
};

export const getHrUpcoming = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const today = todayDateOnly();
    const until = addDays(today, 60);

    const [pendingLeaves, calendarItems] = await Promise.all([
      LeaveRequest.findAll({
        where: { schoolId, status: "pending" },
        include: leaveIncludes,
        order: [["startDate", "ASC"], ["id", "DESC"]],
        limit: 20,
      }),
      SchoolCalendar.findAll({
        where: {
          schoolId,
          startDate: { [Op.lte]: until },
          endDate: { [Op.gte]: today },
        },
        order: [["startDate", "ASC"], ["id", "ASC"]],
        limit: 20,
      }),
    ]);

    res.json({
      pendingLeaves,
      calendarItems,
      pendingLeaveCount: pendingLeaves.length,
      from: today,
      until,
    });
  } catch (err) {
    next(err);
  }
};
