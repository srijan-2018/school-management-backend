import { NextFunction, Request, Response } from "express";
import { Op, fn, col, literal } from "sequelize";
import Student from "../models/student.model";
import Teacher from "../models/teacher.model";
import Class from "../models/class.model";
import Fee from "../models/fee.model";
import Attendance from "../models/attendance.model";
import User from "../models/user.model";
import Admission from "../models/admission.model";
import TransportVehicle from "../models/transport-vehicle.model";
import HostelRoom from "../models/hostel-room.model";
import { requireSchoolId } from "../helpers/school-scope";

const parseDays = (value: unknown, fallback = 30, max = 90) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
};

const toDateOnly = (date: Date) => date.toISOString().slice(0, 10);

export const getOverview = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const today = toDateOnly(new Date());

    const [
      students,
      teachers,
      classes,
      pendingFees,
      paidFees,
      presentToday,
      pendingAdmissions,
      vehicles,
      rooms,
    ] = await Promise.all([
      Student.count({ where: { schoolId } }),
      Teacher.count({
        include: [
          {
            model: User,
            where: { schoolId },
            required: true,
            attributes: [],
          },
        ],
      }),
      Class.count({ where: { schoolId } }),
      Fee.sum("amount", {
        where: {
          schoolId,
          status: { [Op.in]: ["pending", "partial", "overdue"] },
        },
      }),
      Fee.sum("amount", { where: { schoolId, status: "paid" } }),
      Attendance.count({ where: { schoolId, date: today, status: "present" } }),
      Admission.count({ where: { schoolId, status: "pending" } }),
      TransportVehicle.count({ where: { schoolId, status: "active" } }),
      HostelRoom.count({ where: { schoolId } }),
    ]);

    res.json({
      overview: {
        students,
        teachers,
        classes,
        pendingFeeAmount: Number(pendingFees ?? 0),
        paidFeeAmount: Number(paidFees ?? 0),
        presentToday,
        pendingAdmissions,
        activeVehicles: vehicles,
        hostelRooms: rooms,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getAttendanceAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const days = parseDays(req.query.days, 30);
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceDate = toDateOnly(since);

    const rows = await Attendance.findAll({
      where: {
        schoolId,
        date: { [Op.gte]: sinceDate },
      },
      attributes: ["status"],
    });

    const byStatus: Record<string, number> = {
      present: 0,
      absent: 0,
      late: 0,
      half_day: 0,
    };

    for (const row of rows as Array<{ status: string }>) {
      const status = String(row.status);
      byStatus[status] = (byStatus[status] ?? 0) + 1;
    }

    res.json({
      attendanceAnalytics: {
        since: sinceDate,
        days,
        byStatus,
        total: rows.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getFinanceAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const statuses = ["pending", "paid", "partial", "overdue", "waived"] as const;
    const totals: Record<string, number> = {};

    for (const status of statuses) {
      totals[status] = Number(
        (await Fee.sum("amount", { where: { schoolId, status } })) ?? 0,
      );
    }

    res.json({ financeAnalytics: { totalsByStatus: totals } });
  } catch (err) {
    next(err);
  }
};

export const getAttendanceTimeseries = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const days = parseDays(req.query.days, 30);
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    const sinceDate = toDateOnly(since);

    const rows = await Attendance.findAll({
      where: {
        schoolId,
        date: { [Op.gte]: sinceDate },
      },
      attributes: ["date", "status", [fn("COUNT", col("id")), "count"]],
      group: ["date", "status"],
      raw: true,
    });

    const byDate = new Map<
      string,
      {
        date: string;
        present: number;
        absent: number;
        late: number;
        half_day: number;
        total: number;
        rate: number;
      }
    >();

    for (let i = 0; i < days; i += 1) {
      const date = new Date(since);
      date.setDate(since.getDate() + i);
      const key = toDateOnly(date);
      byDate.set(key, {
        date: key,
        present: 0,
        absent: 0,
        late: 0,
        half_day: 0,
        total: 0,
        rate: 0,
      });
    }

    for (const row of rows as Array<{
      date: string;
      status: string;
      count: string | number;
    }>) {
      const point = byDate.get(String(row.date));
      if (!point) continue;
      const count = Number(row.count ?? 0);
      const status = String(row.status);
      if (status === "present") point.present += count;
      else if (status === "absent") point.absent += count;
      else if (status === "late") point.late += count;
      else if (status === "half_day") point.half_day += count;
      point.total += count;
    }

    const points = Array.from(byDate.values()).map((point) => ({
      ...point,
      rate:
        point.total > 0
          ? Math.round(
              ((point.present + point.late * 0.5 + point.half_day * 0.5) /
                point.total) *
                1000,
            ) / 10
          : 0,
    }));

    res.json({
      attendanceTimeseries: {
        since: sinceDate,
        days,
        points,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getFinanceTimeseries = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const months = Math.min(Math.max(Number(req.query.months) || 6, 1), 12);
    const since = new Date();
    since.setMonth(since.getMonth() - (months - 1), 1);
    since.setHours(0, 0, 0, 0);

    const rows = await Fee.findAll({
      where: {
        schoolId,
        status: "paid",
        updatedAt: { [Op.gte]: since },
      },
      attributes: [
        [fn("DATE_FORMAT", col("updatedAt"), "%Y-%m"), "period"],
        [fn("SUM", col("amount")), "paid"],
      ],
      group: [literal("period")],
      order: [[literal("period"), "ASC"]],
      raw: true,
    });

    const paidByPeriod = new Map(
      (rows as Array<{ period: string; paid: string | number }>).map((row) => [
        String(row.period),
        Number(row.paid ?? 0),
      ]),
    );

    const points: Array<{ period: string; label: string; paid: number }> = [];
    for (let i = 0; i < months; i += 1) {
      const date = new Date(since.getFullYear(), since.getMonth() + i, 1);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      points.push({
        period,
        label: date.toLocaleString("en-IN", {
          month: "short",
          year: "2-digit",
        }),
        paid: paidByPeriod.get(period) ?? 0,
      });
    }

    res.json({
      financeTimeseries: {
        months,
        points,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getClassSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const today = toDateOnly(new Date());
    const classes = await Class.findAll({
      where: { schoolId },
      attributes: ["id", "name", "section"],
      order: [["name", "ASC"]],
    });

    const summary = await Promise.all(
      classes.map(async (klass) => {
        const classId = Number(klass.id);
        const [students, presentToday, markedToday] = await Promise.all([
          Student.count({ where: { schoolId, classId } }),
          Attendance.count({
            where: { schoolId, classId, date: today, status: "present" },
          }),
          Attendance.count({
            where: { schoolId, classId, date: today },
          }),
        ]);

        return {
          classId,
          name: String(klass.name ?? ""),
          section: klass.section ? String(klass.section) : null,
          students,
          presentToday,
          markedToday,
          attendanceRate:
            markedToday > 0
              ? Math.round((presentToday / markedToday) * 1000) / 10
              : 0,
        };
      }),
    );

    res.json({
      classSummary: {
        date: today,
        classes: summary,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getReports = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const days = parseDays(req.query.days, 30);
    const today = toDateOnly(new Date());
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    const sinceDate = toDateOnly(since);

    const monthStart = new Date();
    monthStart.setMonth(monthStart.getMonth() - 5, 1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      students,
      teachers,
      classesCount,
      pendingFees,
      paidFees,
      presentToday,
      pendingAdmissions,
      vehicles,
      rooms,
      attendanceRows,
      attendanceGrouped,
      financeStatusRows,
      financeMonthRows,
      classes,
    ] = await Promise.all([
      Student.count({ where: { schoolId } }),
      Teacher.count({
        include: [
          {
            model: User,
            where: { schoolId },
            required: true,
            attributes: [],
          },
        ],
      }),
      Class.count({ where: { schoolId } }),
      Fee.sum("amount", {
        where: {
          schoolId,
          status: { [Op.in]: ["pending", "partial", "overdue"] },
        },
      }),
      Fee.sum("amount", { where: { schoolId, status: "paid" } }),
      Attendance.count({ where: { schoolId, date: today, status: "present" } }),
      Admission.count({ where: { schoolId, status: "pending" } }),
      TransportVehicle.count({ where: { schoolId, status: "active" } }),
      HostelRoom.count({ where: { schoolId } }),
      Attendance.findAll({
        where: { schoolId, date: { [Op.gte]: sinceDate } },
        attributes: ["status"],
      }),
      Attendance.findAll({
        where: { schoolId, date: { [Op.gte]: sinceDate } },
        attributes: ["date", "status", [fn("COUNT", col("id")), "count"]],
        group: ["date", "status"],
        raw: true,
      }),
      Promise.all(
        (["pending", "paid", "partial", "overdue", "waived"] as const).map(
          async (status) =>
            [
              status,
              Number(
                (await Fee.sum("amount", { where: { schoolId, status } })) ?? 0,
              ),
            ] as const,
        ),
      ),
      Fee.findAll({
        where: {
          schoolId,
          status: "paid",
          updatedAt: { [Op.gte]: monthStart },
        },
        attributes: [
          [fn("DATE_FORMAT", col("updatedAt"), "%Y-%m"), "period"],
          [fn("SUM", col("amount")), "paid"],
        ],
        group: [literal("period")],
        order: [[literal("period"), "ASC"]],
        raw: true,
      }),
      Class.findAll({
        where: { schoolId },
        attributes: ["id", "name", "section"],
        order: [["name", "ASC"]],
      }),
    ]);

    const byStatus: Record<string, number> = {
      present: 0,
      absent: 0,
      late: 0,
      half_day: 0,
    };
    for (const row of attendanceRows as Array<{ status: string }>) {
      const status = String(row.status);
      byStatus[status] = (byStatus[status] ?? 0) + 1;
    }

    const byDate = new Map<
      string,
      {
        date: string;
        present: number;
        absent: number;
        late: number;
        half_day: number;
        total: number;
        rate: number;
      }
    >();
    for (let i = 0; i < days; i += 1) {
      const date = new Date(since);
      date.setDate(since.getDate() + i);
      const key = toDateOnly(date);
      byDate.set(key, {
        date: key,
        present: 0,
        absent: 0,
        late: 0,
        half_day: 0,
        total: 0,
        rate: 0,
      });
    }
    for (const row of attendanceGrouped as Array<{
      date: string;
      status: string;
      count: string | number;
    }>) {
      const point = byDate.get(String(row.date));
      if (!point) continue;
      const count = Number(row.count ?? 0);
      const status = String(row.status);
      if (status === "present") point.present += count;
      else if (status === "absent") point.absent += count;
      else if (status === "late") point.late += count;
      else if (status === "half_day") point.half_day += count;
      point.total += count;
    }

    const attendancePoints = Array.from(byDate.values()).map((point) => ({
      ...point,
      rate:
        point.total > 0
          ? Math.round(
              ((point.present + point.late * 0.5 + point.half_day * 0.5) /
                point.total) *
                1000,
            ) / 10
          : 0,
    }));

    const financeTotals = Object.fromEntries(financeStatusRows) as Record<
      string,
      number
    >;

    const paidByPeriod = new Map(
      (
        financeMonthRows as Array<{ period: string; paid: string | number }>
      ).map((row) => [String(row.period), Number(row.paid ?? 0)]),
    );
    const financePoints: Array<{
      period: string;
      label: string;
      paid: number;
    }> = [];
    for (let i = 0; i < 6; i += 1) {
      const date = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth() + i,
        1,
      );
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      financePoints.push({
        period,
        label: date.toLocaleString("en-IN", {
          month: "short",
          year: "2-digit",
        }),
        paid: paidByPeriod.get(period) ?? 0,
      });
    }

    const classSummary = await Promise.all(
      classes.map(async (klass) => {
        const classId = Number(klass.id);
        const [classStudents, classPresent, classMarked] = await Promise.all([
          Student.count({ where: { schoolId, classId } }),
          Attendance.count({
            where: { schoolId, classId, date: today, status: "present" },
          }),
          Attendance.count({ where: { schoolId, classId, date: today } }),
        ]);

        return {
          classId,
          name: String(klass.name ?? ""),
          section: klass.section ? String(klass.section) : null,
          students: classStudents,
          presentToday: classPresent,
          markedToday: classMarked,
          attendanceRate:
            classMarked > 0
              ? Math.round((classPresent / classMarked) * 1000) / 10
              : 0,
        };
      }),
    );

    const paidFeeAmount = Number(paidFees ?? 0);
    const pendingFeeAmount = Number(pendingFees ?? 0);
    const feeBase = paidFeeAmount + pendingFeeAmount;

    res.json({
      generatedAt: new Date().toISOString(),
      overview: {
        students,
        teachers,
        classes: classesCount,
        pendingFeeAmount,
        paidFeeAmount,
        presentToday,
        pendingAdmissions,
        activeVehicles: vehicles,
        hostelRooms: rooms,
        collectionRate:
          feeBase > 0
            ? Math.round((paidFeeAmount / feeBase) * 1000) / 10
            : 0,
      },
      attendanceAnalytics: {
        since: sinceDate,
        days,
        byStatus,
        total: attendanceRows.length,
      },
      attendanceTimeseries: {
        since: sinceDate,
        days,
        points: attendancePoints,
      },
      financeAnalytics: {
        totalsByStatus: financeTotals,
      },
      financeTimeseries: {
        months: 6,
        points: financePoints,
      },
      classSummary: {
        date: today,
        classes: classSummary,
      },
    });
  } catch (err) {
    next(err);
  }
};
