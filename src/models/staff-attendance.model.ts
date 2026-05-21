import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import User from "./user.model";
import { STAFF_ATTENDANCE_ROLES, type UserRole } from "../utils/roles";

class StaffAttendance extends Model {
  public id!: number;
  public userId!: number;
  public role!: UserRole;
  public date!: string;
  public status!: "present" | "late";
  public checkInTime!: Date;
  public checkOutTime?: Date | null;
}

StaffAttendance.init(
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM(...STAFF_ATTENDANCE_ROLES),
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("present", "late"),
      allowNull: false,
      defaultValue: "present",
    },
    checkInTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    checkOutTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    checkInLatitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    checkInLongitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    checkOutLatitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    checkOutLongitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    checkInLocationText: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    checkOutLocationText: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "StaffAttendance",
    timestamps: true,
  },
);

StaffAttendance.belongsTo(User, { foreignKey: "userId" });
User.hasMany(StaffAttendance, { foreignKey: "userId", as: "staffAttendance" });

export default StaffAttendance;
