import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import Teacher from "./teacher.model";
import Class from "./class.model";

class TeacherClass extends Model {
  public id!: number;
  public teacherId!: number;
  public classId!: number;
}

TeacherClass.init(
  {
    teacherId: { type: DataTypes.INTEGER, allowNull: false },
    classId: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    sequelize,
    modelName: "TeacherClass",
    timestamps: true,
    indexes: [{ unique: true, fields: ["teacherId", "classId"] }],
  },
);

Teacher.belongsToMany(Class, { through: TeacherClass, foreignKey: "teacherId" });
Class.belongsToMany(Teacher, { through: TeacherClass, foreignKey: "classId" });

export default TeacherClass;
