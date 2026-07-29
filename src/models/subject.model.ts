import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import Class from "./class.model";
import School from "./school.model";

class Subject extends Model {
  public id!: number;
  public name!: string;
  public classId!: number;
  public schoolId?: number | null;
}

Subject.init(
  {
    name: DataTypes.STRING,
    classId: DataTypes.INTEGER,
    schoolId: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    sequelize,
    modelName: "Subject",
    timestamps: true,
  },
);

Subject.belongsTo(Class, { foreignKey: "classId" });
Subject.belongsTo(School, { foreignKey: "schoolId" });
School.hasMany(Subject, { foreignKey: "schoolId", as: "subjects" });

export default Subject;
