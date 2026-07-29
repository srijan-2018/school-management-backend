import { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";

import Admission from "../models/admission.model";
import Attendance from "../models/attendance.model";
import Class from "../models/class.model";
import Exam from "../models/exam.model";
import Fee from "../models/fee.model";
import InventoryItem from "../models/inventory-item.model";
import School from "../models/school.model";
import Student from "../models/student.model";
import Teacher from "../models/teacher.model";
import User from "../models/user.model";
import * as analytics from "./analytics.controller";

export const getOverview = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  return analytics.getOverview(req, res, next);
};

export const getPlatformOverview = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const schools = await School.findAll({
      order: [["name", "ASC"]],
    });

    const schoolAnalytics = await Promise.all(
      schools.map(async (school) => {
        const schoolId = Number(school.id);
        const [
          users,
          students,
          teachers,
          classes,
          presentToday,
          paidFeeAmount,
          pendingFeeAmount,
          exams,
          inventoryItems,
          pendingAdmissions,
        ] = await Promise.all([
          User.count({ where: { schoolId } }),
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
          Attendance.count({
            where: { schoolId, date: today, status: "present" },
          }),
          Fee.sum("amount", { where: { schoolId, status: "paid" } }),
          Fee.sum("amount", {
            where: {
              schoolId,
              status: { [Op.in]: ["pending", "partial", "overdue"] },
            },
          }),
          Exam.count({ where: { schoolId } }),
          InventoryItem.count({ where: { schoolId } }),
          Admission.count({ where: { schoolId, status: "pending" } }),
        ]);

        return {
          school: {
            id: schoolId,
            name: school.name,
            code: school.get("code") ?? null,
            isActive: school.get("isActive") !== false,
          },
          users,
          students,
          teachers,
          classes,
          presentToday,
          attendanceRate:
            students > 0
              ? Math.min(100, Math.round((presentToday / students) * 1000) / 10)
              : 0,
          paidFeeAmount: Number(paidFeeAmount ?? 0),
          pendingFeeAmount: Number(pendingFeeAmount ?? 0),
          exams,
          inventoryItems,
          pendingAdmissions,
        };
      }),
    );

    const totals = schoolAnalytics.reduce(
      (summary, item) => ({
        schools: summary.schools + 1,
        activeSchools: summary.activeSchools + (item.school.isActive ? 1 : 0),
        users: summary.users + item.users,
        students: summary.students + item.students,
        teachers: summary.teachers + item.teachers,
        classes: summary.classes + item.classes,
        presentToday: summary.presentToday + item.presentToday,
        paidFeeAmount: summary.paidFeeAmount + item.paidFeeAmount,
        pendingFeeAmount: summary.pendingFeeAmount + item.pendingFeeAmount,
        exams: summary.exams + item.exams,
        inventoryItems: summary.inventoryItems + item.inventoryItems,
        pendingAdmissions:
          summary.pendingAdmissions + item.pendingAdmissions,
      }),
      {
        schools: 0,
        activeSchools: 0,
        users: 0,
        students: 0,
        teachers: 0,
        classes: 0,
        presentToday: 0,
        paidFeeAmount: 0,
        pendingFeeAmount: 0,
        exams: 0,
        inventoryItems: 0,
        pendingAdmissions: 0,
      },
    );

    res.json({
      generatedAt: new Date().toISOString(),
      totals: {
        ...totals,
        attendanceRate:
          totals.students > 0
            ? Math.min(
                100,
                Math.round((totals.presentToday / totals.students) * 1000) / 10,
              )
            : 0,
      },
      schools: schoolAnalytics,
    });
  } catch (error) {
    next(error);
  }
};
