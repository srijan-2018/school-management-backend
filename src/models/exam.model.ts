import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";
import Class from "./class.model";
import Subject from "./subject.model";
import User from "./user.model";
import ExamSchedule from "./exam-schedule.model";

export const EXAM_STATUSES = [
  "draft",
  "scheduled",
  "completed",
  "cancelled",
] as const;

export type ExamStatus = (typeof EXAM_STATUSES)[number];

class Exam extends Model {
  public id!: number;
  public schoolId!: number;
  public scheduleId?: number | null;
  public name!: string;
  public description?: string | null;
  public classId?: number | null;
  public subjectId?: number | null;
  public date?: string | null;
  public startTime?: string | null;
  public endTime?: string | null;
  public durationMinutes?: number | null;
  public totalMarks?: number | null;
  public passingMarks?: number | null;
  public status!: ExamStatus;
  public sortOrder?: number | null;
  public createdByUserId?: number | null;
}

Exam.init(
  {
    schoolId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    scheduleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    classId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    subjectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    startTime: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    endTime: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    durationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    totalMarks: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    passingMarks: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...EXAM_STATUSES),
      allowNull: false,
      defaultValue: "scheduled",
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    createdByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  { sequelize, modelName: "Exam", timestamps: true },
);

Exam.belongsTo(School, { foreignKey: "schoolId" });
Exam.belongsTo(ExamSchedule, { foreignKey: "scheduleId" });
Exam.belongsTo(Class, { foreignKey: "classId" });
Exam.belongsTo(Subject, { foreignKey: "subjectId" });
Exam.belongsTo(User, {
  foreignKey: "createdByUserId",
  as: "createdBy",
});
ExamSchedule.hasMany(Exam, {
  foreignKey: "scheduleId",
  as: "exams",
});

export default Exam;
