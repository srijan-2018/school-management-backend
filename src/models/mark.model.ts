import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import Exam from "./exam.model";
import Student from "./student.model";

class Mark extends Model {
  public id!: number;
}

Mark.init(
  {
    examId: { type: DataTypes.INTEGER, allowNull: false },
    studentId: { type: DataTypes.INTEGER, allowNull: false },
    marks: { type: DataTypes.FLOAT, allowNull: false },
    grade: { type: DataTypes.STRING, allowNull: true },
    remarks: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: "Mark", timestamps: true },
);

Mark.belongsTo(Exam, { foreignKey: "examId" });
Mark.belongsTo(Student, { foreignKey: "studentId" });

export default Mark;
