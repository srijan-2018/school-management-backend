import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";
import Class from "./class.model";
import User from "./user.model";

export const EXAM_SCHEDULE_STATUSES = ["draft", "active", "completed"] as const;

export type ExamScheduleStatus = (typeof EXAM_SCHEDULE_STATUSES)[number];

class ExamSchedule extends Model {
  public id!: number;
  public schoolId!: number;
  public title!: string;
  public description?: string | null;
  public classId?: number | null;
  public academicYear?: string | null;
  public term?: string | null;
  public status!: ExamScheduleStatus;
  public createdByUserId?: number | null;
}

ExamSchedule.init(
  {
    schoolId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
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
    academicYear: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    term: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...EXAM_SCHEDULE_STATUSES),
      allowNull: false,
      defaultValue: "draft",
    },
    createdByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "ExamSchedule",
    timestamps: true,
  },
);

ExamSchedule.belongsTo(School, { foreignKey: "schoolId" });
ExamSchedule.belongsTo(Class, { foreignKey: "classId" });
ExamSchedule.belongsTo(User, {
  foreignKey: "createdByUserId",
  as: "createdBy",
});

export default ExamSchedule;
