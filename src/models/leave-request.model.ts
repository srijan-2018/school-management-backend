import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";
import User from "./user.model";

class LeaveRequest extends Model {
  public id!: number;
  public schoolId!: number;
  public userId!: number;
  public leaveType!: string;
  public startDate!: string;
  public endDate!: string;
  public reason?: string | null;
  public status!: "pending" | "approved" | "rejected";
  public approvedBy?: number | null;
  public approvedAt?: Date | null;
  public reviewNote?: string | null;
}

LeaveRequest.init(
  {
    schoolId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    leaveType: { type: DataTypes.STRING, allowNull: false },
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: { type: DataTypes.DATEONLY, allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      defaultValue: "pending",
    },
    approvedBy: { type: DataTypes.INTEGER, allowNull: true },
    approvedAt: { type: DataTypes.DATE, allowNull: true },
    reviewNote: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    modelName: "LeaveRequest",
    tableName: "LeaveRequests",
    timestamps: true,
  },
);

LeaveRequest.belongsTo(School, { foreignKey: "schoolId" });
LeaveRequest.belongsTo(User, { foreignKey: "userId" });
LeaveRequest.belongsTo(User, { foreignKey: "approvedBy", as: "approver" });
School.hasMany(LeaveRequest, { foreignKey: "schoolId", as: "leaveRequests" });

export default LeaveRequest;
