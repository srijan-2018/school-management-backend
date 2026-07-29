import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import Student from "./student.model";
import Class from "./class.model";
import School from "./school.model";

class Attendance extends Model {
  public id!: number;
  public studentId!: number;
  public classId!: number;
  public schoolId?: number | null;
}

Attendance.init(
  {
    studentId: { type: DataTypes.INTEGER, allowNull: false },
    classId: { type: DataTypes.INTEGER, allowNull: false },
    schoolId: { type: DataTypes.INTEGER, allowNull: true },
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
Attendance.belongsTo(School, { foreignKey: "schoolId" });
School.hasMany(Attendance, { foreignKey: "schoolId", as: "attendances" });

export default Attendance;
