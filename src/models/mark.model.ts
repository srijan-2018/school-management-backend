import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import Exam from "./exam.model";
import Student from "./student.model";
import School from "./school.model";

class Mark extends Model {
  public id!: number;
  public schoolId?: number | null;
}

Mark.init(
  {
    examId: { type: DataTypes.INTEGER, allowNull: false },
    studentId: { type: DataTypes.INTEGER, allowNull: false },
    schoolId: { type: DataTypes.INTEGER, allowNull: true },
    marks: { type: DataTypes.FLOAT, allowNull: false },
    grade: { type: DataTypes.STRING, allowNull: true },
    remarks: { type: DataTypes.STRING, allowNull: true },
    isPublished: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  { sequelize, modelName: "Mark", timestamps: true },
);

Mark.belongsTo(Exam, { foreignKey: "examId" });
Mark.belongsTo(Student, { foreignKey: "studentId" });
Mark.belongsTo(School, { foreignKey: "schoolId" });
School.hasMany(Mark, { foreignKey: "schoolId", as: "marks" });

export default Mark;
