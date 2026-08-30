import { Op, QueryTypes, Transaction } from "sequelize";

import { sequelize } from "../config/db";
import AssignmentSubmission from "../models/assignment-submission.model";
import Class from "../models/class.model";
import ClassSection from "../models/class-section.model";
import FeePayment from "../models/fee-payment.model";
import Notification from "../models/notification.model";
import NotificationRead from "../models/notification-read.model";
import Parent from "../models/parent.model";
import ParentStudent from "../models/parent-student.model";
import Section from "../models/section.model";
import Student from "../models/student.model";
import StudentDocument from "../models/student-document.model";
import Teacher from "../models/teacher.model";
import TeacherClass from "../models/teacher-class.model";
import TransportTrip from "../models/transport-trip.model";
import TransportTripLocation from "../models/transport-trip-location.model";
import TransportTripStudent from "../models/transport-trip-student.model";
import User from "../models/user.model";
import UserSession from "../models/user-session.model";

const quoteIdentifier = (value: string) => `\`${value.replace(/`/g, "``")}\``;

async function collectIds(
  model: { findAll: (options: object) => Promise<any[]> },
  where: Record<string, unknown>,
  transaction: Transaction,
) {
  const rows = await model.findAll({
    where,
    attributes: ["id"],
    transaction,
  });
  return rows
    .map((row) => Number(row.get ? row.get("id") : row.id))
    .filter((id) => Number.isInteger(id) && id > 0);
}

async function destroyByIds(
  model: { destroy: (options: object) => Promise<unknown> },
  field: string,
  ids: number[],
  transaction: Transaction,
) {
  if (ids.length === 0) {
    return;
  }

  await model.destroy({
    where: { [field]: { [Op.in]: ids } },
    transaction,
  });
}

/**
 * Permanently removes a school and its related rows.
 * DELETE previously only set `isActive = false`, so the school stayed in the list.
 */
export async function permanentlyDeleteSchool(schoolId: number) {
  try {
    await sequelize.transaction(async (transaction) => {
    const userIds = await collectIds(User, { schoolId }, transaction);
    const studentIds = await collectIds(Student, { schoolId }, transaction);
    const classIds = await collectIds(Class, { schoolId }, transaction);
    const sectionIds = await collectIds(Section, { schoolId }, transaction);
    const tripIds = await collectIds(TransportTrip, { schoolId }, transaction);
    const notificationIds = await collectIds(
      Notification,
      { schoolId },
      transaction,
    );
    const teacherIds =
      userIds.length > 0
        ? await collectIds(Teacher, { userId: { [Op.in]: userIds } }, transaction)
        : [];
    const parentIds =
      userIds.length > 0
        ? await collectIds(Parent, { userId: { [Op.in]: userIds } }, transaction)
        : [];

    await sequelize.query("SET FOREIGN_KEY_CHECKS = 0", { transaction });

    try {
      await destroyByIds(NotificationRead, "notificationId", notificationIds, transaction);
      await destroyByIds(TransportTripLocation, "tripId", tripIds, transaction);
      await destroyByIds(TransportTripStudent, "tripId", tripIds, transaction);
      await destroyByIds(TransportTripStudent, "studentId", studentIds, transaction);
      await destroyByIds(FeePayment, "studentId", studentIds, transaction);
      await destroyByIds(AssignmentSubmission, "studentId", studentIds, transaction);
      await destroyByIds(StudentDocument, "studentId", studentIds, transaction);
      await destroyByIds(ParentStudent, "studentId", studentIds, transaction);
      await destroyByIds(ParentStudent, "parentId", parentIds, transaction);
      await destroyByIds(TeacherClass, "teacherId", teacherIds, transaction);
      await destroyByIds(TeacherClass, "classId", classIds, transaction);
      await destroyByIds(ClassSection, "classId", classIds, transaction);
      await destroyByIds(ClassSection, "sectionId", sectionIds, transaction);
      await destroyByIds(UserSession, "userId", userIds, transaction);
      await destroyByIds(Teacher, "userId", userIds, transaction);
      await destroyByIds(Parent, "userId", userIds, transaction);

      const scopedColumns = await sequelize.query<Record<string, string>>(
        `SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND COLUMN_NAME IN ('schoolId', 'actorSchoolId')`,
        { type: QueryTypes.SELECT, transaction },
      );

      for (const column of scopedColumns) {
        const tableName = column.tableName || column.TABLE_NAME;
        const columnName = column.columnName || column.COLUMN_NAME;
        if (!tableName || !columnName || tableName.toLowerCase() === "schools") {
          continue;
        }

        await sequelize.query(
          `DELETE FROM ${quoteIdentifier(tableName)} WHERE ${quoteIdentifier(
            columnName,
          )} = :schoolId`,
          { replacements: { schoolId }, transaction },
        );
      }

      await sequelize.query(
        `DELETE FROM ${quoteIdentifier("Schools")} WHERE id = :schoolId`,
        { replacements: { schoolId }, transaction },
      );
    } finally {
      await sequelize.query("SET FOREIGN_KEY_CHECKS = 1", { transaction });
    }
    });
  } finally {
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
  }
}
