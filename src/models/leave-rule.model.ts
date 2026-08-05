import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";

class LeaveRule extends Model {
  public id!: number;
  public schoolId!: number;
  public leaveType!: string;
  public annualAllowance!: number;
  public maxConsecutiveDays?: number | null;
  public minNoticeDays!: number;
  public isActive!: boolean;
  public description?: string | null;
}

LeaveRule.init(
  {
    schoolId: { type: DataTypes.INTEGER, allowNull: false },
    leaveType: { type: DataTypes.STRING, allowNull: false },
    annualAllowance: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    maxConsecutiveDays: { type: DataTypes.INTEGER, allowNull: true },
    minNoticeDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    description: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    modelName: "LeaveRule",
    tableName: "LeaveRules",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["schoolId", "leaveType"],
        name: "leave_rules_school_type_unique",
      },
    ],
  },
);

LeaveRule.belongsTo(School, { foreignKey: "schoolId" });
School.hasMany(LeaveRule, { foreignKey: "schoolId", as: "leaveRules" });

export default LeaveRule;
