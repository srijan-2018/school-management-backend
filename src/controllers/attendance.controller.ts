import { NextFunction, Request, Response } from "express";
import Attendance from "../models/attendance.model";
import StaffAttendance from "../models/staff-attendance.model";
import AttendanceRule from "../models/attendance-rule.model";
import { create, update } from "../helpers/crud.helpers";
import { AppError } from "../middlewares/error.middleware";
import {
  normalizeRole,
  STAFF_ATTENDANCE_ROLES,
  type UserRole,
} from "../utils/roles";
import { buildPagination, getPagination } from "../utils/pagination";

export const markAttendance = create(Attendance, "attendance");
export const updateAttendance = update(Attendance, "attendance");

const staffAttendanceRoleSet = new Set<UserRole>(STAFF_ATTENDANCE_ROLES);
const attendanceRulesSingletonId = 1;

type CurrentUser = {
  id: number;
  role: UserRole;
};

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

const getCurrentUser = (req: Request): CurrentUser => {
  const rawUser = (req as any).user;
  const userId = Number(rawUser?.id);
  const role = normalizeRole(rawUser?.role);

  if (!Number.isInteger(userId) || userId <= 0 || !role) {
    throw new AppError("Unauthorized", 401);
  }

  return { id: userId, role };
};

const ensureStaffAttendanceRole = (role: UserRole) => {
  if (!staffAttendanceRoleSet.has(role)) {
    throw new AppError("This role cannot use staff attendance", 403);
  }
};

const toOptionalNumber = (value: unknown, field: string) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new AppError(`${field} must be a valid number`, 400);
  }

  return parsed;
};

const toOptionalString = (value: unknown) => {
  if (value === undefined || value === null) return undefined;

  const normalized = String(value).trim();
  return normalized || undefined;
};

const ensureTimeString = (value: unknown, field: string) => {
  const normalized = String(value ?? "").trim();

  if (!timePattern.test(normalized)) {
    throw new AppError(`${field} must use HH:mm format`, 400);
  }

  return normalized;
};

const getTodayDate = (date = new Date()) => date.toISOString().slice(0, 10);

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const getMinutesNow = (date = new Date()) =>
  date.getHours() * 60 + date.getMinutes();

const toRadians = (value: number) => (value * Math.PI) / 180;

const calculateDistanceMeters = (
  latitudeOne: number,
  longitudeOne: number,
  latitudeTwo: number,
  longitudeTwo: number,
) => {
  const earthRadius = 6371000;
  const deltaLatitude = toRadians(latitudeTwo - latitudeOne);
  const deltaLongitude = toRadians(longitudeTwo - longitudeOne);
  const latOne = toRadians(latitudeOne);
  const latTwo = toRadians(latitudeTwo);

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latOne) * Math.cos(latTwo) * Math.sin(deltaLongitude / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getOrCreateAttendanceRule = async () => {
  const existingRule = await AttendanceRule.findByPk(
    attendanceRulesSingletonId,
  );

  if (existingRule) {
    return existingRule;
  }

  return AttendanceRule.create({
    id: attendanceRulesSingletonId,
  });
};

const validateLocationAgainstRule = (
  rule: any,
  latitude: number | undefined,
  longitude: number | undefined,
) => {
  if (!rule.requireLocation) {
    return;
  }

  if (latitude === undefined || longitude === undefined) {
    throw new AppError(
      "latitude and longitude are required by the attendance rules",
      400,
    );
  }

  const officeLatitude = toOptionalNumber(
    rule.officeLatitude,
    "officeLatitude",
  );
  const officeLongitude = toOptionalNumber(
    rule.officeLongitude,
    "officeLongitude",
  );

  if (officeLatitude === undefined || officeLongitude === undefined) {
    return;
  }

  const distance = calculateDistanceMeters(
    latitude,
    longitude,
    officeLatitude,
    officeLongitude,
  );

  if (distance > Number(rule.allowedRadiusMeters ?? 0)) {
    throw new AppError(
      `You are outside the allowed attendance radius of ${rule.allowedRadiusMeters} meters`,
      400,
    );
  }
};

const serializeStaffAttendance = (attendance: any) => ({
  id: attendance.id,
  userId: attendance.userId,
  role: attendance.role,
  date: attendance.date,
  status: attendance.status,
  checkInTime: attendance.checkInTime,
  checkOutTime: attendance.checkOutTime,
  checkInLocation: {
    latitude:
      attendance.checkInLatitude === null ||
      attendance.checkInLatitude === undefined
        ? null
        : Number(attendance.checkInLatitude),
    longitude:
      attendance.checkInLongitude === null ||
      attendance.checkInLongitude === undefined
        ? null
        : Number(attendance.checkInLongitude),
    text: attendance.checkInLocationText ?? null,
  },
  checkOutLocation: {
    latitude:
      attendance.checkOutLatitude === null ||
      attendance.checkOutLatitude === undefined
        ? null
        : Number(attendance.checkOutLatitude),
    longitude:
      attendance.checkOutLongitude === null ||
      attendance.checkOutLongitude === undefined
        ? null
        : Number(attendance.checkOutLongitude),
    text: attendance.checkOutLocationText ?? null,
  },
  createdAt: attendance.createdAt,
  updatedAt: attendance.updatedAt,
});

export const getAttendanceRules = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rules = await getOrCreateAttendanceRule();

    res.json({
      attendanceRules: rules,
    });
  } catch (err) {
    next(err);
  }
};

export const updateAttendanceRules = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const currentUser = getCurrentUser(req);
    const rules = await getOrCreateAttendanceRule();

    const nextValues = {
      workDayStartTime:
        req.body?.workDayStartTime !== undefined
          ? ensureTimeString(req.body.workDayStartTime, "workDayStartTime")
          : rules.get("workDayStartTime"),
      lateAfterTime:
        req.body?.lateAfterTime !== undefined
          ? ensureTimeString(req.body.lateAfterTime, "lateAfterTime")
          : rules.get("lateAfterTime"),
      checkOutStartTime:
        req.body?.checkOutStartTime !== undefined
          ? ensureTimeString(req.body.checkOutStartTime, "checkOutStartTime")
          : rules.get("checkOutStartTime"),
      requireLocation:
        req.body?.requireLocation !== undefined
          ? Boolean(req.body.requireLocation)
          : Boolean(rules.get("requireLocation")),
      officeLatitude:
        req.body?.officeLatitude !== undefined
          ? (toOptionalNumber(req.body.officeLatitude, "officeLatitude") ??
            null)
          : rules.get("officeLatitude"),
      officeLongitude:
        req.body?.officeLongitude !== undefined
          ? (toOptionalNumber(req.body.officeLongitude, "officeLongitude") ??
            null)
          : rules.get("officeLongitude"),
      allowedRadiusMeters:
        req.body?.allowedRadiusMeters !== undefined
          ? Math.max(
              0,
              Math.round(
                toOptionalNumber(
                  req.body.allowedRadiusMeters,
                  "allowedRadiusMeters",
                ) ?? 0,
              ),
            )
          : Number(rules.get("allowedRadiusMeters") ?? 0),
      updatedByUserId: currentUser.id,
    };

    if (
      nextValues.requireLocation &&
      (nextValues.officeLatitude === null) !==
        (nextValues.officeLongitude === null)
    ) {
      throw new AppError(
        "officeLatitude and officeLongitude must both be set when location validation is enabled",
        400,
      );
    }

    if (!rules.get("createdByUserId")) {
      rules.set("createdByUserId", currentUser.id);
    }

    await rules.update(nextValues);

    res.json({
      message: "Attendance rules updated successfully",
      attendanceRules: rules,
    });
  } catch (err) {
    next(err);
  }
};

export const checkInStaffAttendance = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const currentUser = getCurrentUser(req);
    ensureStaffAttendanceRole(currentUser.role);

    const rules = await getOrCreateAttendanceRule();
    const latitude = toOptionalNumber(req.body?.latitude, "latitude");
    const longitude = toOptionalNumber(req.body?.longitude, "longitude");
    const locationText = toOptionalString(req.body?.locationText);
    const today = getTodayDate();

    validateLocationAgainstRule(rules, latitude, longitude);

    const existingAttendance = await StaffAttendance.findOne({
      where: {
        userId: currentUser.id,
        date: today,
      },
      order: [["id", "DESC"]],
    });

    if (existingAttendance?.get("checkInTime")) {
      throw new AppError("You have already checked in today", 409);
    }

    const now = new Date();
    const status =
      getMinutesNow(now) > timeToMinutes(String(rules.get("lateAfterTime")))
        ? "late"
        : "present";

    const attendance = await StaffAttendance.create({
      userId: currentUser.id,
      role: currentUser.role,
      date: today,
      status,
      checkInTime: now,
      checkInLatitude: latitude ?? null,
      checkInLongitude: longitude ?? null,
      checkInLocationText: locationText ?? null,
    });

    res.status(201).json({
      message: "Checked in successfully",
      attendance: serializeStaffAttendance(attendance),
    });
  } catch (err) {
    next(err);
  }
};

export const checkOutStaffAttendance = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const currentUser = getCurrentUser(req);
    ensureStaffAttendanceRole(currentUser.role);

    const rules = await getOrCreateAttendanceRule();
    const latitude = toOptionalNumber(req.body?.latitude, "latitude");
    const longitude = toOptionalNumber(req.body?.longitude, "longitude");
    const locationText = toOptionalString(req.body?.locationText);
    const today = getTodayDate();

    validateLocationAgainstRule(rules, latitude, longitude);

    if (
      getMinutesNow() < timeToMinutes(String(rules.get("checkOutStartTime")))
    ) {
      throw new AppError(
        `Check-out is not allowed before ${rules.get("checkOutStartTime")}`,
        400,
      );
    }

    const attendance: any = await StaffAttendance.findOne({
      where: {
        userId: currentUser.id,
        date: today,
      },
      order: [["id", "DESC"]],
    });

    if (!attendance?.checkInTime) {
      throw new AppError("You must check in before checking out", 400);
    }

    if (attendance.checkOutTime) {
      throw new AppError("You have already checked out today", 409);
    }

    await attendance.update({
      checkOutTime: new Date(),
      checkOutLatitude: latitude ?? null,
      checkOutLongitude: longitude ?? null,
      checkOutLocationText: locationText ?? null,
    });

    res.json({
      message: "Checked out successfully",
      attendance: serializeStaffAttendance(attendance),
    });
  } catch (err) {
    next(err);
  }
};

export const getMyStaffAttendance = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const currentUser = getCurrentUser(req);
    ensureStaffAttendanceRole(currentUser.role);

    const { page, limit, offset } = getPagination(req);
    const { rows: attendance, count } = await StaffAttendance.findAndCountAll({
      where: { userId: currentUser.id },
      order: [
        ["date", "DESC"],
        ["id", "DESC"],
      ],
      limit,
      offset,
    });

    res.json({
      attendance: attendance.map(serializeStaffAttendance),
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};

export const getAttendanceByClass = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { rows: attendance, count } = await Attendance.findAndCountAll({
      where: { classId: req.params.classId },
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

export const getAttendanceByStudent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { rows: attendance, count } = await Attendance.findAndCountAll({
      where: { studentId: req.params.studentId },
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
