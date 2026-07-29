import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";
import User from "./user.model";

class LeaveRequest extends Model {
  public id!: number;
  public schoolId!: number;
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
School.hasMany(LeaveRequest, { foreignKey: "schoolId", as: "leaveRequests" });

export default LeaveRequest;
