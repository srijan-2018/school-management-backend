import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import User from "./user.model";
import Class from "./class.model";
import Section from "./section.model";

class Student extends Model {
  public id!: number;
  public userId!: number;
  public classId!: number;
  public sectionId?: number | null;
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
    rollNumber: DataTypes.STRING,
  },
  {
    sequelize,
    modelName: "Student",
    timestamps: true,
  },
);

// 🔗 Relations
Student.belongsTo(User, { foreignKey: "userId" });
User.hasOne(Student, { foreignKey: "userId", as: "student" });
Student.belongsTo(Class, { foreignKey: "classId" });
Student.belongsTo(Section, { foreignKey: "sectionId" });
Section.hasMany(Student, { foreignKey: "sectionId" });

export default Student;
