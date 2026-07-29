import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import User from "./user.model";
import Class from "./class.model";
import Section from "./section.model";
import School from "./school.model";

class Student extends Model {
  public id!: number;
  public userId!: number;
  public classId!: number;
  public sectionId?: number | null;
  public schoolId?: number | null;
  public rollNumber!: string;
}

Student.init(
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    classId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    sectionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    schoolId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    rollNumber: DataTypes.STRING,
  },
  {
    sequelize,
    modelName: "Student",
    timestamps: true,
  },
);

Student.belongsTo(User, { foreignKey: "userId" });
User.hasOne(Student, { foreignKey: "userId", as: "student" });
Student.belongsTo(Class, { foreignKey: "classId" });
Student.belongsTo(Section, { foreignKey: "sectionId" });
Section.hasMany(Student, { foreignKey: "sectionId" });
Student.belongsTo(School, { foreignKey: "schoolId" });
School.hasMany(Student, { foreignKey: "schoolId", as: "students" });

export default Student;
