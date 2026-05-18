import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import Class from "./class.model";

class Section extends Model {
  public id!: number;
  public name!: string;
  public classId?: number | null;
}

Section.init(
  {
    name: { type: DataTypes.STRING, allowNull: false },
    classId: { type: DataTypes.INTEGER, allowNull: true },
  },
  { sequelize, modelName: "Section", timestamps: true },
);

Section.belongsTo(Class, { foreignKey: "classId" });
Class.hasMany(Section, { foreignKey: "classId", as: "sections" });

export default Section;
