import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import Class from "./class.model";
import Section from "./section.model";

class ClassSection extends Model {
  public id!: number;
  public classId!: number;
  public sectionId!: number;
}

ClassSection.init(
  {
    classId: { type: DataTypes.INTEGER, allowNull: false },
    sectionId: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    sequelize,
    modelName: "ClassSection",
    timestamps: true,
    indexes: [{ unique: true, fields: ["classId", "sectionId"] }],
  },
);

Class.belongsToMany(Section, {
  through: ClassSection,
  foreignKey: "classId",
  otherKey: "sectionId",
  as: "sections",
});
Section.belongsToMany(Class, {
  through: ClassSection,
  foreignKey: "sectionId",
  otherKey: "classId",
  as: "classes",
});

export default ClassSection;
