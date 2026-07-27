import { DataTypes, Model } from "sequelize";

import { sequelize } from "../config/db";
import Subject from "./subject.model";

class Chapter extends Model {
  public id!: number;
  public name!: string;
  public description!: string | null;
  public subjectId!: number;
  public sortOrder!: number | null;
}

Chapter.init(
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    subjectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: "Chapter",
    tableName: "Chapters",
    timestamps: true,
  },
);

Chapter.belongsTo(Subject, { foreignKey: "subjectId", as: "subject" });
Subject.hasMany(Chapter, { foreignKey: "subjectId", as: "chapters" });

export default Chapter;
