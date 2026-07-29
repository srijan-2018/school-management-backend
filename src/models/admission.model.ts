import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";

class Admission extends Model {
  public id!: number;
  public schoolId!: number;
}

Admission.init(
  {
    schoolId: { type: DataTypes.INTEGER, allowNull: false },
    studentName: { type: DataTypes.STRING, allowNull: false },
    parentName: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true },
    phone: { type: DataTypes.STRING, allowNull: true },
    appliedClassId: { type: DataTypes.INTEGER, allowNull: true },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected", "enrolled"),
      allowNull: false,
      defaultValue: "pending",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    enrolledStudentId: { type: DataTypes.INTEGER, allowNull: true },
  },
  { sequelize, modelName: "Admission", tableName: "Admissions", timestamps: true },
);

Admission.belongsTo(School, { foreignKey: "schoolId" });
School.hasMany(Admission, { foreignKey: "schoolId", as: "admissions" });

export default Admission;
