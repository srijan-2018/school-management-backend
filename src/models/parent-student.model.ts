import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import Parent from "./parent.model";
import Student from "./student.model";

class ParentStudent extends Model {
  public id!: number;
  public parentId!: number;
  public studentId!: number;
}

ParentStudent.init(
  {
    parentId: { type: DataTypes.INTEGER, allowNull: false },
    studentId: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    sequelize,
    modelName: "ParentStudent",
    timestamps: true,
    indexes: [{ unique: true, fields: ["parentId", "studentId"] }],
  },
);

Parent.belongsToMany(Student, { through: ParentStudent, foreignKey: "parentId" });
Student.belongsToMany(Parent, { through: ParentStudent, foreignKey: "studentId" });

export default ParentStudent;
