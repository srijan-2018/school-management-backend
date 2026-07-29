import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";

class PayrollRun extends Model {
  public id!: number;
  public schoolId!: number;
}

PayrollRun.init(
  {
    schoolId: { type: DataTypes.INTEGER, allowNull: false },
    month: { type: DataTypes.INTEGER, allowNull: false },
    year: { type: DataTypes.INTEGER, allowNull: false },
    status: {
      type: DataTypes.ENUM("draft", "processed", "paid"),
      defaultValue: "draft",
    },
    totalAmount: { type: DataTypes.FLOAT, allowNull: true, defaultValue: 0 },
    notes: { type: DataTypes.TEXT, allowNull: true },
    payslips: { type: DataTypes.JSON, allowNull: true },
  },
  {
    sequelize,
    modelName: "PayrollRun",
    tableName: "PayrollRuns",
    timestamps: true,
  },
);

PayrollRun.belongsTo(School, { foreignKey: "schoolId" });
School.hasMany(PayrollRun, { foreignKey: "schoolId", as: "payrollRuns" });

export default PayrollRun;
