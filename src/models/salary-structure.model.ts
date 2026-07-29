import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";
import StaffProfile from "./staff-profile.model";

class SalaryStructure extends Model {
  public id!: number;
  public schoolId!: number;
}

SalaryStructure.init(
  {
    schoolId: { type: DataTypes.INTEGER, allowNull: false },
    staffProfileId: { type: DataTypes.INTEGER, allowNull: false },
    basic: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    hra: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    allowances: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    deductions: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    effectiveFrom: { type: DataTypes.DATEONLY, allowNull: true },
  },
  {
    sequelize,
    modelName: "SalaryStructure",
    tableName: "SalaryStructures",
    timestamps: true,
  },
);

SalaryStructure.belongsTo(School, { foreignKey: "schoolId" });
SalaryStructure.belongsTo(StaffProfile, { foreignKey: "staffProfileId" });
School.hasMany(SalaryStructure, {
  foreignKey: "schoolId",
  as: "salaryStructures",
});

export default SalaryStructure;
