import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import Student from "./student.model";
import Class from "./class.model";

class Attendance extends Model {
  public id!: number;
  public studentId!: number;
  public classId!: number;
}

Attendance.init(
  {
    studentId: { type: DataTypes.INTEGER, allowNull: false },
    classId: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    status: {
      type: DataTypes.ENUM("present", "absent", "late", "half_day"),
      allowNull: false,
    },
    remarks: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: "Attendance", timestamps: true },
);

Attendance.belongsTo(Student, { foreignKey: "studentId" });
Attendance.belongsTo(Class, { foreignKey: "classId" });

export default Attendance;
