import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";
import User from "./user.model";

class LeaveBalance extends Model {
  public id!: number;
  public schoolId!: number;
  public userId!: number;
  public leaveType!: string;
  public year!: number;
  public totalDays!: number;
  public usedDays!: number;
}

LeaveBalance.init(
  {
    schoolId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    leaveType: { type: DataTypes.STRING, allowNull: false },
    year: { type: DataTypes.INTEGER, allowNull: false },
    totalDays: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    usedDays: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: "LeaveBalance",
    tableName: "LeaveBalances",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["schoolId", "userId", "leaveType", "year"],
        name: "leave_balances_school_user_type_year_unique",
      },
    ],
  },
);

LeaveBalance.belongsTo(School, { foreignKey: "schoolId" });
LeaveBalance.belongsTo(User, { foreignKey: "userId" });
School.hasMany(LeaveBalance, { foreignKey: "schoolId", as: "leaveBalances" });
User.hasMany(LeaveBalance, { foreignKey: "userId", as: "leaveBalances" });

export default LeaveBalance;
