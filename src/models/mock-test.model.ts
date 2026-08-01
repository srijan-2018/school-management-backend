import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import User from "./user.model";
import School from "./school.model";
import Student from "./student.model";

class MockTest extends Model {
  public id!: number;
  public schoolId?: number | null;
}

MockTest.init(
  {
    studentId: { type: DataTypes.INTEGER, allowNull: true },
    generatedByUserId: { type: DataTypes.INTEGER, allowNull: true },
    assignedByUserId: { type: DataTypes.INTEGER, allowNull: true },
    schoolId: { type: DataTypes.INTEGER, allowNull: true },
    classId: { type: DataTypes.INTEGER, allowNull: true },
    className: { type: DataTypes.STRING, allowNull: true },
    subjectId: { type: DataTypes.INTEGER, allowNull: true },
    subjectName: { type: DataTypes.STRING, allowNull: true },
    chapterId: { type: DataTypes.INTEGER, allowNull: true },
    chapterName: { type: DataTypes.STRING, allowNull: true },
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

MockTest.belongsTo(User, {
  as: "generatedByUser",
  foreignKey: "generatedByUserId",
});
MockTest.belongsTo(User, {
  as: "assignedByUser",
  foreignKey: "assignedByUserId",
});
MockTest.belongsTo(Student, {
  as: "student",
  foreignKey: "studentId",
});
MockTest.belongsTo(School, { foreignKey: "schoolId" });
School.hasMany(MockTest, { foreignKey: "schoolId", as: "mockTests" });

export default MockTest;
