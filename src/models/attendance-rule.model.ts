import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import User from "./user.model";
import School from "./school.model";

class AttendanceRule extends Model {
  public id!: number;
  public schoolId?: number | null;
}

AttendanceRule.init(
  {
    schoolId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    workDayStartTime: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "08:00",
    },
    lateAfterTime: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "08:15",
    },
    checkOutStartTime: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "15:00",
    },
    requireLocation: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    officeLatitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    officeLongitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    allowedRadiusMeters: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 200,
    },
    createdByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    updatedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "AttendanceRule",
    timestamps: true,
  },
);

AttendanceRule.belongsTo(User, {
  foreignKey: "createdByUserId",
  as: "createdBy",
});
AttendanceRule.belongsTo(User, {
  foreignKey: "updatedByUserId",
  as: "updatedBy",
});
AttendanceRule.belongsTo(School, { foreignKey: "schoolId" });
School.hasMany(AttendanceRule, { foreignKey: "schoolId", as: "attendanceRules" });

export default AttendanceRule;
