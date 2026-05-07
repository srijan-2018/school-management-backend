import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

class Assignment extends Model {
  public id!: number;
}

Assignment.init(
  {
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    classId: { type: DataTypes.INTEGER, allowNull: false },
    subjectId: { type: DataTypes.INTEGER, allowNull: true },
    teacherId: { type: DataTypes.INTEGER, allowNull: true },
    dueDate: { type: DataTypes.DATEONLY, allowNull: true },
  },
  { sequelize, modelName: "Assignment", timestamps: true },
);

export default Assignment;
