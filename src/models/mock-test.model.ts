import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

class MockTest extends Model {
  public id!: number;
}

MockTest.init(
  {
    studentId: { type: DataTypes.INTEGER, allowNull: true },
    subjectId: { type: DataTypes.INTEGER, allowNull: true },
    title: { type: DataTypes.STRING, allowNull: false },
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
