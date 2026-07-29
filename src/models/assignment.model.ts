import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";

class Assignment extends Model {
  public id!: number;
  public schoolId?: number | null;
}

Assignment.init(
  {
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    classId: { type: DataTypes.INTEGER, allowNull: false },
    subjectId: { type: DataTypes.INTEGER, allowNull: true },
    teacherId: { type: DataTypes.INTEGER, allowNull: true },
    schoolId: { type: DataTypes.INTEGER, allowNull: true },
    dueDate: { type: DataTypes.DATEONLY, allowNull: true },
    status: {
      type: DataTypes.ENUM("draft", "published", "closed"),
      defaultValue: "published",
    },
  },
  { sequelize, modelName: "Assignment", timestamps: true },
);

Assignment.belongsTo(School, { foreignKey: "schoolId" });
School.hasMany(Assignment, { foreignKey: "schoolId", as: "assignments" });

export default Assignment;
