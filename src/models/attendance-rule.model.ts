import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import User from "./user.model";

class AttendanceRule extends Model {
  public id!: number;
}

AttendanceRule.init(
  {
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

export default AttendanceRule;
