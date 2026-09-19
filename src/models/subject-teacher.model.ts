import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import Subject from "./subject.model";
import Teacher from "./teacher.model";
import School from "./school.model";

class SubjectTeacher extends Model {
  public id!: number;
  public subjectId!: number;
  public teacherId!: number;
  public schoolId!: number;
}

SubjectTeacher.init(
  {
    subjectId: { type: DataTypes.INTEGER, allowNull: false },
    teacherId: { type: DataTypes.INTEGER, allowNull: false },
    schoolId: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    sequelize,
    modelName: "SubjectTeacher",
    timestamps: true,
    indexes: [{ unique: true, fields: ["subjectId", "teacherId"] }],
  },
);

SubjectTeacher.belongsTo(Subject, { foreignKey: "subjectId" });
SubjectTeacher.belongsTo(Teacher, { foreignKey: "teacherId" });
SubjectTeacher.belongsTo(School, { foreignKey: "schoolId" });
Subject.hasMany(SubjectTeacher, { foreignKey: "subjectId", as: "subjectTeachers" });
Teacher.hasMany(SubjectTeacher, { foreignKey: "teacherId", as: "subjectTeachers" });

export default SubjectTeacher;
