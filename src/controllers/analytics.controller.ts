import { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
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

export const getOverview = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const today = new Date().toISOString().slice(0, 10);

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
      Fee.sum("amount", { where: { schoolId, status: { [Op.in]: ["pending", "partial", "overdue"] } } }),
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

    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceDate = since.toISOString().slice(0, 10);

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

    for (const row of rows as any[]) {
      const status = String(row.status);
      byStatus[status] = (byStatus[status] ?? 0) + 1;
    }

    res.json({ attendanceAnalytics: { since: sinceDate, byStatus, total: rows.length } });
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
