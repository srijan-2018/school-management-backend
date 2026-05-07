import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

class Timetable extends Model {
  public id!: number;
}

Timetable.init(
  {
    classId: { type: DataTypes.INTEGER, allowNull: false },
    sectionId: { type: DataTypes.INTEGER, allowNull: true },
    subjectId: { type: DataTypes.INTEGER, allowNull: false },
    teacherId: { type: DataTypes.INTEGER, allowNull: true },
    day: { type: DataTypes.STRING, allowNull: false },
    startTime: { type: DataTypes.STRING, allowNull: false },
    endTime: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, modelName: "Timetable", timestamps: true },
);

export default Timetable;
