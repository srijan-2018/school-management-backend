import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import Student from "./student.model";

class StudentDocument extends Model {
  public id!: number;
}

StudentDocument.init(
  {
    studentId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: true },
    url: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, modelName: "StudentDocument", timestamps: true },
);

StudentDocument.belongsTo(Student, { foreignKey: "studentId" });

export default StudentDocument;
