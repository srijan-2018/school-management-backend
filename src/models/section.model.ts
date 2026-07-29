import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import Class from "./class.model";
import School from "./school.model";

class Section extends Model {
  public id!: number;
  public name!: string;
  public classId?: number | null;
  public schoolId?: number | null;
}

Section.init(
  {
    name: { type: DataTypes.STRING, allowNull: false },
    classId: { type: DataTypes.INTEGER, allowNull: true },
    schoolId: { type: DataTypes.INTEGER, allowNull: true },
  },
  { sequelize, modelName: "Section", timestamps: true },
);

Section.belongsTo(Class, { foreignKey: "classId" });
Class.hasMany(Section, { foreignKey: "classId", as: "sections" });
Section.belongsTo(School, { foreignKey: "schoolId" });
School.hasMany(Section, { foreignKey: "schoolId", as: "sections" });

export default Section;
