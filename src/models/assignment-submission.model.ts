import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import Assignment from "./assignment.model";
import Student from "./student.model";

class AssignmentSubmission extends Model {
  public id!: number;
}

AssignmentSubmission.init(
  {
    assignmentId: { type: DataTypes.INTEGER, allowNull: false },
    studentId: { type: DataTypes.INTEGER, allowNull: false },
    fileUrl: { type: DataTypes.STRING, allowNull: true },
    remarks: { type: DataTypes.STRING, allowNull: true },
    status: {
      type: DataTypes.ENUM("submitted", "reviewed", "rejected"),
      defaultValue: "submitted",
    },
  },
  { sequelize, modelName: "AssignmentSubmission", timestamps: true },
);

AssignmentSubmission.belongsTo(Assignment, { foreignKey: "assignmentId" });
AssignmentSubmission.belongsTo(Student, { foreignKey: "studentId" });

export default AssignmentSubmission;
