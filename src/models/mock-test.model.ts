import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

class MockTest extends Model {
  public id!: number;
}

MockTest.init(
  {
    studentId: { type: DataTypes.INTEGER, allowNull: true },
    classId: { type: DataTypes.INTEGER, allowNull: true },
    className: { type: DataTypes.STRING, allowNull: true },
    subjectId: { type: DataTypes.INTEGER, allowNull: true },
    subjectName: { type: DataTypes.STRING, allowNull: true },
    title: { type: DataTypes.STRING, allowNull: false },
    level: {
      type: DataTypes.ENUM("easy", "medium", "hard"),
      allowNull: true,
    },
    questions: { type: DataTypes.JSON, allowNull: true },
    submittedAnswers: { type: DataTypes.JSON, allowNull: true },
    result: { type: DataTypes.JSON, allowNull: true },
    aiSuggestion: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM("generated", "submitted", "evaluated"),
      defaultValue: "generated",
    },
  },
  { sequelize, modelName: "MockTest", timestamps: true },
);

export default MockTest;
