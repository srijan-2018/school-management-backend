import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import Class from "./class.model";
import Subject from "./subject.model";

class Exam extends Model {
  public id!: number;
}

Exam.init(
  {
    name: { type: DataTypes.STRING, allowNull: false },
    classId: { type: DataTypes.INTEGER, allowNull: false },
    subjectId: { type: DataTypes.INTEGER, allowNull: true },
    date: { type: DataTypes.DATEONLY, allowNull: true },
    totalMarks: { type: DataTypes.FLOAT, allowNull: true },
  },
  { sequelize, modelName: "Exam", timestamps: true },
);

Exam.belongsTo(Class, { foreignKey: "classId" });
Exam.belongsTo(Subject, { foreignKey: "subjectId" });

export default Exam;
