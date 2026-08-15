import { NextFunction, Request, Response } from "express";
import PDFDocument from "pdfkit";
import { Op } from "sequelize";
import StaffProfile from "../models/staff-profile.model";
import LeaveRequest from "../models/leave-request.model";
import LeaveRule from "../models/leave-rule.model";
import LeaveBalance from "../models/leave-balance.model";
import SalaryStructure from "../models/salary-structure.model";
import PayrollRun from "../models/payroll-run.model";
import StaffAttendance from "../models/staff-attendance.model";
import SchoolCalendar from "../models/school-calendar.model";
import User from "../models/user.model";
import { requireSchoolId } from "../helpers/school-scope";
import { AppError } from "../middlewares/error.middleware";
import { buildPagination, getPagination } from "../utils/pagination";
import {
  EMPLOYEE_LEAVE_ROLES,
  HR_MANAGER_ROLES,
  normalizeRole,
} from "../utils/roles";
import { LEAVE_TYPES, normalizeLeaveType } from "../constants/leave-types";
import { userSafeAttributes } from "./user.controller";
import { sequelize } from "../config/db";
import { notifyCalendarPublished } from "../services/notification.service";

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

const balanceIncludes = [{ model: User, attributes: userSafeAttributes }];

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

const currentLeaveYear = () => new Date().getUTCFullYear();

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const dateOnly = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const countWeekdays = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  let count = 0;
  for (const current = new Date(start); current <= end; current.setUTCDate(current.getUTCDate() + 1)) {
    const day = current.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
};

const countWeekdayOverlap = (
  startDate: string,
  endDate: string,
  rangeStart: string,
  rangeEnd: string,
) => {
  const start = startDate > rangeStart ? startDate : rangeStart;
  const end = endDate < rangeEnd ? endDate : rangeEnd;
  return start <= end ? countWeekdays(start, end) : 0;
};

const countInclusiveDays = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
  return Math.floor((end - start) / 86_400_000) + 1;
};

const serializeBalance = (balance: any, pendingDays = 0) => {
  const json =
    typeof balance?.toJSON === "function" ? balance.toJSON() : balance;
  const totalDays = Number(json.totalDays ?? 0);
  const usedDays = Number(json.usedDays ?? 0);
  const remainingDays = Math.max(0, totalDays - usedDays);
  const availableDays = Math.max(0, remainingDays - pendingDays);

  return {
    ...json,
    pendingDays,
    remainingDays,
    availableDays,
  };
};

async function getPendingLeaveDays(params: {
  schoolId: number;
  userId: number;
  leaveType: string;
  excludeLeaveId?: number;
}) {
  const where: Record<string, unknown> = {
    schoolId: params.schoolId,
    userId: params.userId,
    leaveType: params.leaveType,
    status: "pending",
  };
  if (params.excludeLeaveId) {
    where.id = { [Op.ne]: params.excludeLeaveId };
  }

  const pending = await LeaveRequest.findAll({
    where,
    attributes: ["startDate", "endDate"],
  });

  return pending.reduce((sum, row: any) => {
    const start = toDateOnly(row.startDate);
    const end = toDateOnly(row.endDate);
    if (!start || !end) return sum;
    return sum + countInclusiveDays(start, end);
  }, 0);
}

async function assertLeaveEligibility(params: {
  schoolId: number;
  userId: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  year?: number;
}) {
  const year = params.year ?? currentLeaveYear();
  const requestedDays = countInclusiveDays(params.startDate, params.endDate);

  const rule = await LeaveRule.findOne({
    where: {
      schoolId: params.schoolId,
      leaveType: params.leaveType,
      isActive: true,
    },
  });

  if (!rule) {
    throw new AppError(
      `No active leave rule found for ${params.leaveType}. Ask the school owner to add a leave rule first.`,
      400,
    );
  }

  if (
    rule.maxConsecutiveDays != null &&
    Number(rule.maxConsecutiveDays) > 0 &&
    requestedDays > Number(rule.maxConsecutiveDays)
  ) {
    throw new AppError(
      `This leave type allows at most ${rule.maxConsecutiveDays} consecutive day(s).`,
      400,
    );
  }

  if (Number(rule.minNoticeDays) > 0) {
    const earliest = addDays(todayDateOnly(), Number(rule.minNoticeDays));
    if (params.startDate < earliest) {
      throw new AppError(
        `This leave type requires at least ${rule.minNoticeDays} day(s) notice.`,
        400,
      );
    }
  }

  const balance = await LeaveBalance.findOne({
    where: {
      schoolId: params.schoolId,
      userId: params.userId,
      leaveType: params.leaveType,
      year,
    },
  });

  if (!balance) {
    throw new AppError(
      `No leave balance assigned for ${params.leaveType} in ${year}. Ask the school owner to assign a leave balance.`,
      400,
    );
  }

  const pendingDays = await getPendingLeaveDays({
    schoolId: params.schoolId,
    userId: params.userId,
    leaveType: params.leaveType,
  });

  const availableDays = Math.max(
    0,
    Number(balance.totalDays) - Number(balance.usedDays) - pendingDays,
  );

  if (requestedDays > availableDays) {
    throw new AppError(
      `Insufficient leave balance. Available: ${availableDays} day(s), requested: ${requestedDays} day(s).`,
      400,
    );
  }

  return { requestedDays, balance, rule, pendingDays, year };
}

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
    const profiles = rows.map((row: any) => row.toJSON());
    const profileUserIds = new Set(profiles.map((profile) => Number(profile.userId)));
    const users = await User.findAll({
      where: {
        schoolId,
        role: { [Op.in]: EMPLOYEE_LEAVE_ROLES },
      },
      attributes: userSafeAttributes,
      order: [["name", "ASC"]],
    });
    const missingProfiles = users
      .filter((user: any) => !profileUserIds.has(Number(user.id)))
      .map((user: any) => ({
        id: -Number(user.id),
        schoolId,
        userId: Number(user.id),
        employeeCode: "",
        department: "",
        designation: "Staff",
        joinDate: "",
        salary: 0,
        status: "profile_missing",
        User: user.toJSON(),
      }));
    const staff = [...profiles, ...missingProfiles];
    res.json({
      staff,
      pagination: buildPagination(page, limit, Math.max(count, staff.length)),
    });
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

    await assertLeaveEligibility({
      schoolId,
      userId,
      leaveType,
      startDate,
      endDate,
    });

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

    await sequelize.transaction(async (transaction) => {
      if (status === "approved") {
        const startDate = toDateOnly(leave.startDate);
        const endDate = toDateOnly(leave.endDate);
        if (!startDate || !endDate) {
          throw new AppError("Leave request has invalid dates", 400);
        }

        const year = Number(String(startDate).slice(0, 4)) || currentLeaveYear();
        const requestedDays = countInclusiveDays(startDate, endDate);
        const balance = await LeaveBalance.findOne({
          where: {
            schoolId,
            userId: leave.userId,
            leaveType: leave.leaveType,
            year,
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!balance) {
          throw new AppError(
            `Cannot approve: no leave balance for ${leave.leaveType} in ${year}.`,
            400,
          );
        }

        const remainingDays =
          Number(balance.totalDays) - Number(balance.usedDays);
        if (requestedDays > remainingDays) {
          throw new AppError(
            `Cannot approve: insufficient balance. Remaining: ${remainingDays} day(s), requested: ${requestedDays} day(s).`,
            400,
          );
        }

        await balance.update(
          { usedDays: Number(balance.usedDays) + requestedDays },
          { transaction },
        );
      }

      await leave.update(
        {
          status,
          approvedBy: req.user?.id ?? null,
          approvedAt: new Date(),
          reviewNote,
        },
        { transaction },
      );
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

export const listLeaveRules = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const activeOnly =
      String(req.query.active ?? "").toLowerCase() === "1" ||
      String(req.query.active ?? "").toLowerCase() === "true";

    const where: Record<string, unknown> = { schoolId };
    if (activeOnly) where.isActive = true;

    const rules = await LeaveRule.findAll({
      where,
      order: [["leaveType", "ASC"]],
    });

    res.json({ rules });
  } catch (err) {
    next(err);
  }
};

export const createLeaveRule = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const leaveType = normalizeLeaveType(req.body?.leaveType);
    if (!leaveType) {
      throw new AppError(
        `leaveType must be one of: ${LEAVE_TYPES.join(", ")}`,
        400,
      );
    }

    const annualAllowance = Number(req.body?.annualAllowance);
    if (!Number.isFinite(annualAllowance) || annualAllowance < 0) {
      throw new AppError("annualAllowance must be a non-negative number", 400);
    }

    const maxConsecutiveDays =
      req.body?.maxConsecutiveDays === null ||
      req.body?.maxConsecutiveDays === undefined ||
      req.body?.maxConsecutiveDays === ""
        ? null
        : Number(req.body.maxConsecutiveDays);
    if (
      maxConsecutiveDays !== null &&
      (!Number.isInteger(maxConsecutiveDays) || maxConsecutiveDays < 1)
    ) {
      throw new AppError(
        "maxConsecutiveDays must be a positive integer or empty",
        400,
      );
    }

    const minNoticeDays = Number(req.body?.minNoticeDays ?? 0);
    if (!Number.isInteger(minNoticeDays) || minNoticeDays < 0) {
      throw new AppError("minNoticeDays must be a non-negative integer", 400);
    }

    const existing = await LeaveRule.findOne({
      where: { schoolId, leaveType },
    });
    if (existing) {
      throw new AppError(
        `A leave rule for ${leaveType} already exists. Update it instead.`,
        400,
      );
    }

    const rule = await LeaveRule.create({
      schoolId,
      leaveType,
      annualAllowance,
      maxConsecutiveDays,
      minNoticeDays,
      isActive: req.body?.isActive !== false,
      description:
        typeof req.body?.description === "string"
          ? req.body.description.trim()
          : null,
    });

    res.status(201).json({ message: "Leave rule created", rule });
  } catch (err) {
    next(err);
  }
};

export const updateLeaveRule = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const rule: any = await LeaveRule.findOne({
      where: { id: req.params.id, schoolId },
    });
    if (!rule) return res.status(404).json({ message: "Leave rule not found" });

    const payload: Record<string, unknown> = {};

    if (req.body?.leaveType != null) {
      const leaveType = normalizeLeaveType(req.body.leaveType);
      if (!leaveType) {
        throw new AppError(
          `leaveType must be one of: ${LEAVE_TYPES.join(", ")}`,
          400,
        );
      }
      payload.leaveType = leaveType;
    }

    if (req.body?.annualAllowance != null) {
      const annualAllowance = Number(req.body.annualAllowance);
      if (!Number.isFinite(annualAllowance) || annualAllowance < 0) {
        throw new AppError("annualAllowance must be a non-negative number", 400);
      }
      payload.annualAllowance = annualAllowance;
    }

    if (req.body?.maxConsecutiveDays !== undefined) {
      if (
        req.body.maxConsecutiveDays === null ||
        req.body.maxConsecutiveDays === ""
      ) {
        payload.maxConsecutiveDays = null;
      } else {
        const maxConsecutiveDays = Number(req.body.maxConsecutiveDays);
        if (!Number.isInteger(maxConsecutiveDays) || maxConsecutiveDays < 1) {
          throw new AppError(
            "maxConsecutiveDays must be a positive integer or empty",
            400,
          );
        }
        payload.maxConsecutiveDays = maxConsecutiveDays;
      }
    }

    if (req.body?.minNoticeDays != null) {
      const minNoticeDays = Number(req.body.minNoticeDays);
      if (!Number.isInteger(minNoticeDays) || minNoticeDays < 0) {
        throw new AppError("minNoticeDays must be a non-negative integer", 400);
      }
      payload.minNoticeDays = minNoticeDays;
    }

    if (req.body?.isActive != null) {
      payload.isActive = Boolean(req.body.isActive);
    }

    if (req.body?.description !== undefined) {
      payload.description =
        typeof req.body.description === "string"
          ? req.body.description.trim()
          : null;
    }

    await rule.update(payload);
    res.json({ message: "Leave rule updated", rule });
  } catch (err) {
    next(err);
  }
};

export const deleteLeaveRule = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const rule = await LeaveRule.findOne({
      where: { id: req.params.id, schoolId },
    });
    if (!rule) return res.status(404).json({ message: "Leave rule not found" });

    await rule.destroy();
    res.json({ message: "Leave rule deleted" });
  } catch (err) {
    next(err);
  }
};

export const listLeaveBalances = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const manager = isHrManager(req.user?.role);
    const year = Number(req.query.year) || currentLeaveYear();
    const userIdFilter = Number(req.query.userId);

    const where: Record<string, unknown> = { schoolId, year };
    if (!manager) {
      where.userId = req.user?.id;
    } else if (Number.isInteger(userIdFilter) && userIdFilter > 0) {
      where.userId = userIdFilter;
    }

    const balances = await LeaveBalance.findAll({
      where,
      include: balanceIncludes,
      order: [
        ["userId", "ASC"],
        ["leaveType", "ASC"],
      ],
    });

    const serialized = await Promise.all(
      balances.map(async (balance: any) => {
        const pendingDays = await getPendingLeaveDays({
          schoolId,
          userId: balance.userId,
          leaveType: balance.leaveType,
        });
        return serializeBalance(balance, pendingDays);
      }),
    );

    res.json({ balances: serialized, year });
  } catch (err) {
    next(err);
  }
};

export const upsertLeaveBalance = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const userId = Number(req.body?.userId);
    const leaveType = normalizeLeaveType(req.body?.leaveType);
    const year = Number(req.body?.year) || currentLeaveYear();
    const totalDays = Number(req.body?.totalDays);
    const usedDays =
      req.body?.usedDays === undefined || req.body?.usedDays === null
        ? undefined
        : Number(req.body.usedDays);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new AppError("userId is required", 400);
    }
    if (!leaveType) {
      throw new AppError(
        `leaveType must be one of: ${LEAVE_TYPES.join(", ")}`,
        400,
      );
    }
    if (!Number.isInteger(year) || year < 2000) {
      throw new AppError("year must be a valid year", 400);
    }
    if (!Number.isFinite(totalDays) || totalDays < 0) {
      throw new AppError("totalDays must be a non-negative number", 400);
    }
    if (usedDays !== undefined && (!Number.isFinite(usedDays) || usedDays < 0)) {
      throw new AppError("usedDays must be a non-negative number", 400);
    }

    const employee = await User.findOne({
      where: {
        id: userId,
        schoolId,
        role: { [Op.in]: EMPLOYEE_LEAVE_ROLES },
      },
    });
    if (!employee) {
      throw new AppError(
        "Employee not found in this school, or role cannot receive leave balance",
        404,
      );
    }

    const [balance] = await LeaveBalance.findOrCreate({
      where: { schoolId, userId, leaveType, year },
      defaults: {
        schoolId,
        userId,
        leaveType,
        year,
        totalDays,
        usedDays: usedDays ?? 0,
      },
    });

    const nextUsed =
      usedDays !== undefined ? usedDays : Number(balance.usedDays);
    if (nextUsed > totalDays) {
      throw new AppError("usedDays cannot exceed totalDays", 400);
    }

    await balance.update({
      totalDays,
      usedDays: nextUsed,
    });

    const pendingDays = await getPendingLeaveDays({
      schoolId,
      userId,
      leaveType,
    });
    const refreshed = await LeaveBalance.findByPk(balance.id, {
      include: balanceIncludes,
    });

    res.status(201).json({
      message: "Leave balance saved",
      balance: serializeBalance(refreshed, pendingDays),
    });
  } catch (err) {
    next(err);
  }
};

export const upsertLeaveBalances = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const leaveType = normalizeLeaveType(req.body?.leaveType);
    const year = Number(req.body?.year) || currentLeaveYear();
    const totalDays = Number(req.body?.totalDays);
    const all = req.body?.all === true;
    const requestedUserIds = Array.isArray(req.body?.userIds)
      ? req.body.userIds.map(Number).filter((id: number) => Number.isInteger(id) && id > 0)
      : [];

    if (!leaveType) {
      throw new AppError(
        `leaveType must be one of: ${LEAVE_TYPES.join(", ")}`,
        400,
      );
    }
    if (!Number.isInteger(year) || year < 2000) {
      throw new AppError("year must be a valid year", 400);
    }
    if (!Number.isFinite(totalDays) || totalDays < 0) {
      throw new AppError("totalDays must be a non-negative number", 400);
    }
    if (!all && requestedUserIds.length === 0) {
      throw new AppError("Set all to true or provide userIds", 400);
    }

    const users = await User.findAll({
      where: {
        schoolId,
        role: { [Op.in]: EMPLOYEE_LEAVE_ROLES },
        ...(all ? {} : { id: { [Op.in]: requestedUserIds } }),
      },
      attributes: ["id"],
    });
    if (!users.length) {
      throw new AppError("No eligible employees found for leave balance", 404);
    }

    const transaction = await sequelize.transaction();
    try {
      for (const user of users) {
        const [balance] = await LeaveBalance.findOrCreate({
          where: { schoolId, userId: user.id, leaveType, year },
          defaults: {
            schoolId,
            userId: user.id,
            leaveType,
            year,
            totalDays,
            usedDays: 0,
          },
          transaction,
        });
        if (Number(balance.usedDays) > totalDays) {
          throw new AppError(
            `Total days cannot be less than used days for user ${user.id}`,
            400,
          );
        }
        await balance.update({ totalDays }, { transaction });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    res.status(201).json({
      message: `Leave balance saved for ${users.length} employee(s)`,
      count: users.length,
    });
  } catch (err) {
    next(err);
  }
};

export const listLeaveEmployees = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const employees = await User.findAll({
      where: {
        schoolId,
        role: { [Op.in]: EMPLOYEE_LEAVE_ROLES },
      },
      attributes: userSafeAttributes,
      order: [["name", "ASC"]],
    });

    res.json({ employees });
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
    let staffProfileId = Number(req.body?.staffProfileId);
    const userId = Number(req.body?.userId);
    if (!Number.isInteger(staffProfileId) || staffProfileId <= 0) {
      if (!Number.isInteger(userId) || userId <= 0) {
        throw new AppError("staffProfileId or userId is required", 400);
      }
      const employee = await User.findOne({
        where: { id: userId, schoolId, role: { [Op.in]: EMPLOYEE_LEAVE_ROLES } },
      });
      if (!employee) throw new AppError("Staff user not found in this school", 404);
      const [profile] = await StaffProfile.findOrCreate({
        where: { schoolId, userId },
        defaults: {
          schoolId,
          userId,
          designation: "Staff",
          status: "active",
        },
      });
      staffProfileId = profile.id;
    }
    const profile = await StaffProfile.findOne({ where: { id: staffProfileId, schoolId } });
    if (!profile) throw new AppError("Staff profile not found in this school", 404);
    const basic = Number(req.body?.basic);
    const hra = Number(req.body?.hra ?? 0);
    const allowances = Number(req.body?.allowances ?? 0);
    const deductions = Number(req.body?.deductions ?? 0);
    const effectiveFrom = req.body?.effectiveFrom || null;
    if (!Number.isFinite(basic) || basic <= 0) {
      throw new AppError("basic salary must be greater than zero", 400);
    }
    if (![hra, allowances, deductions].every((value) => Number.isFinite(value) && value >= 0)) {
      throw new AppError("salary components must be non-negative numbers", 400);
    }
    if (effectiveFrom &&
      (typeof effectiveFrom !== "string" || Number.isNaN(Date.parse(effectiveFrom)))) {
      throw new AppError("effectiveFrom must be a valid date", 400);
    }
    const salaryStructure = await SalaryStructure.create({
      ...(req.body ?? {}),
      schoolId,
      staffProfileId,
      basic,
      hra,
      allowances,
      deductions,
      effectiveFrom,
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
    const month = Number(req.body?.month);
    const year = Number(req.body?.year);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: "month must be between 1 and 12" });
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ message: "year must be between 2000 and 2100" });
    }

    const existing = await PayrollRun.findOne({
      where: { schoolId, month, year },
    });
    if (existing) {
      throw new AppError(`Payroll already exists for ${month}/${year}`, 409);
    }

    const payrollStart = dateOnly(year, month, 1);
    const payrollEnd = dateOnly(year, month, new Date(Date.UTC(year, month, 0)).getUTCDate());
    const scheduledDays = countWeekdays(payrollStart, payrollEnd);
    if (!scheduledDays) {
      return res.status(400).json({ message: "No scheduled weekdays found for this month" });
    }

    const staff = await StaffProfile.findAll({
      where: { schoolId, status: "active" },
    });
    if (!staff.length) {
      throw new AppError("No active staff profiles found for payroll", 400);
    }
    const structures = await SalaryStructure.findAll({
      where: { schoolId },
      order: [["effectiveFrom", "DESC"], ["id", "DESC"]],
    });
    const structureMap = new Map<number, any>();
    for (const structure of structures as any[]) {
      const effectiveFrom = structure.effectiveFrom;
      if (effectiveFrom && effectiveFrom > payrollEnd) continue;
      if (!structureMap.has(Number(structure.staffProfileId))) {
        structureMap.set(Number(structure.staffProfileId), structure);
      }
    }

    const userIds = staff.map((profile: any) => Number(profile.userId));
    const attendanceRows = await StaffAttendance.findAll({
      where: {
        schoolId,
        userId: { [Op.in]: userIds.length ? userIds : [-1] },
        date: { [Op.between]: [payrollStart, payrollEnd] },
      },
      attributes: ["userId", "date"],
    });
    const attendanceByUser = new Map<number, Set<string>>();
    for (const row of attendanceRows as any[]) {
      const userId = Number(row.userId);
      if (!attendanceByUser.has(userId)) attendanceByUser.set(userId, new Set());
      attendanceByUser.get(userId)!.add(String(row.date));
    }

    const approvedLeaves = await LeaveRequest.findAll({
      where: {
        schoolId,
        userId: { [Op.in]: userIds.length ? userIds : [-1] },
        status: "approved",
        startDate: { [Op.lte]: payrollEnd },
        endDate: { [Op.gte]: payrollStart },
      },
      attributes: ["userId", "startDate", "endDate"],
    });
    const leaveDaysByUser = new Map<number, number>();
    for (const leave of approvedLeaves as any[]) {
      const userId = Number(leave.userId);
      const days = countWeekdayOverlap(
        String(leave.startDate),
        String(leave.endDate),
        payrollStart,
        payrollEnd,
      );
      leaveDaysByUser.set(userId, (leaveDaysByUser.get(userId) ?? 0) + days);
    }

    const payslips = staff.map((profile: any) => {
      const structure: any = structureMap.get(Number(profile.id));
      const basic = Number(structure?.basic ?? profile.salary ?? 0);
      const hra = Number(structure?.hra ?? 0);
      const allowances = Number(structure?.allowances ?? 0);
      const fixedDeductions = Number(structure?.deductions ?? 0);
      if (![basic, hra, allowances, fixedDeductions].every(Number.isFinite)) {
        throw new AppError(
          `Invalid salary values for staff profile ${profile.id}`,
          400,
        );
      }
      if (basic + hra + allowances <= 0) {
        throw new AppError(
          `No positive salary configured for staff profile ${profile.id}`,
          400,
        );
      }
      const presentDays = attendanceByUser.get(Number(profile.userId))?.size ?? 0;
      const approvedLeaveDays = Math.min(
        scheduledDays,
        leaveDaysByUser.get(Number(profile.userId)) ?? 0,
      );
      const payableDays = Math.min(scheduledDays, presentDays + approvedLeaveDays);
      const absentDays = Math.max(0, scheduledDays - payableDays);
      const gross = basic + hra + allowances;
      const absenceDeduction = (gross / scheduledDays) * absentDays;
      const deductions = fixedDeductions + absenceDeduction;
      const net = Math.max(0, gross - deductions);
      return {
        staffProfileId: profile.id,
        userId: profile.userId,
        basic: roundMoney(basic),
        hra: roundMoney(hra),
        allowances: roundMoney(allowances),
        gross: roundMoney(gross),
        fixedDeductions: roundMoney(fixedDeductions),
        presentDays,
        approvedLeaveDays,
        payableDays,
        absentDays,
        absenceDeduction: roundMoney(absenceDeduction),
        deductions: roundMoney(deductions),
        net: roundMoney(net),
      };
    });

    const totalAmount = roundMoney(
      payslips.reduce((sum: number, slip: { net: number }) => sum + slip.net, 0),
    );

    const payrollRun = await PayrollRun.create({
      schoolId,
      month,
      year,
      status: "draft",
      totalAmount,
      notes: req.body?.notes ?? null,
      payslips,
    });

    res.status(201).json({ message: "Payroll run created", payrollRun });
  } catch (err) {
    next(err);
  }
};

export const updatePayrollRun = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const run: any = await PayrollRun.findOne({
      where: { id: req.params.id, schoolId },
    });
    if (!run) throw new AppError("Payroll run not found", 404);
    if (run.status === "paid") {
      throw new AppError("Paid payroll runs cannot be regenerated", 409);
    }
    await run.destroy();
    req.body = {
      ...(req.body ?? {}),
      month: req.body?.month ?? run.month,
      year: req.body?.year ?? run.year,
      notes: req.body?.notes ?? run.notes,
    };
    return createPayrollRun(req, res, next);
  } catch (err) {
    next(err);
  }
};

export const deletePayrollRun = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const run: any = await PayrollRun.findOne({
      where: { id: req.params.id, schoolId },
    });
    if (!run) throw new AppError("Payroll run not found", 404);
    if (run.status === "paid") {
      throw new AppError("Paid payroll runs cannot be deleted", 409);
    }
    await run.destroy();
    res.json({ message: "Payroll run deleted" });
  } catch (err) {
    next(err);
  }
};

export const listMyPayrollRuns = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const runs: any[] = await PayrollRun.findAll({
      where: { schoolId },
      order: [["year", "DESC"], ["month", "DESC"]],
    });
    const payrollRuns = runs
      .map((run) => run.toJSON())
      .filter((run) =>
        Array.isArray(run.payslips) &&
        run.payslips.some((slip: any) => Number(slip.userId) === Number(req.user?.id)),
      );
    res.json({ payrollRuns });
  } catch (err) {
    next(err);
  }
};

export const downloadMyPayslipPdf = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const run: any = await PayrollRun.findOne({
      where: { id: req.params.id, schoolId },
    });
    const slip = run?.payslips?.find(
      (item: any) => Number(item.userId) === Number(req.user?.id),
    );
    if (!run || !slip) throw new AppError("Payslip not found", 404);

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="payslip-${run.month}-${run.year}.pdf"`,
      );
      res.send(Buffer.concat(chunks));
    });
    doc.fontSize(20).text("Salary Payslip", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Payroll period: ${run.month}/${run.year}`);
    doc.text(`Status: ${run.status}`);
    doc.moveDown();
    doc.text(`Basic salary: ${slip.basic}`);
    doc.text(`HRA: ${slip.hra}`);
    doc.text(`Allowances: ${slip.allowances}`);
    doc.text(`Present days: ${slip.presentDays}`);
    doc.text(`Approved leave days: ${slip.approvedLeaveDays}`);
    doc.text(`Absent days: ${slip.absentDays}`);
    doc.text(`Deductions: ${slip.deductions}`);
    doc.moveDown();
    doc.fontSize(15).text(`Net salary: ${slip.net}`);
    doc.end();
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

    void notifyCalendarPublished({
      schoolId,
      calendarId: Number(calendarItem.get("id")),
      title,
      type: type as "holiday" | "event",
      startDate,
      endDate,
      description,
      createdByUserId: req.user?.id ?? null,
    }).catch(() => undefined);

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
    // Keep the manager dashboard in step with the calendar's upcoming view.
    const until = addDays(today, 365);

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
