import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import Subject from "./subject.model";
import Teacher from "./teacher.model";
import Section from "./section.model";
import Class from "./class.model";
import School from "./school.model";

class Timetable extends Model {
  public id!: number;
  public schoolId?: number | null;
  public classId!: number;
  public sectionId?: number | null;
  public subjectId!: number;
  public teacherId?: number | null;
  public day!: string;
  public startTime!: string;
  public endTime!: string;
  public room?: string | null;
  public Class?: { name?: string } | null;
}

Timetable.init(
  {
    classId: { type: DataTypes.INTEGER, allowNull: false },
    sectionId: { type: DataTypes.INTEGER, allowNull: true },
    subjectId: { type: DataTypes.INTEGER, allowNull: false },
    teacherId: { type: DataTypes.INTEGER, allowNull: true },
    schoolId: { type: DataTypes.INTEGER, allowNull: true },
    day: { type: DataTypes.STRING, allowNull: false },
    startTime: { type: DataTypes.STRING, allowNull: false },
    endTime: { type: DataTypes.STRING, allowNull: false },
    room: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: "Timetable", timestamps: true },
);

Timetable.belongsTo(Subject, { foreignKey: "subjectId" });
Timetable.belongsTo(Teacher, { foreignKey: "teacherId" });
Timetable.belongsTo(Section, { foreignKey: "sectionId" });
Timetable.belongsTo(Class, { foreignKey: "classId" });
Timetable.belongsTo(School, { foreignKey: "schoolId" });
School.hasMany(Timetable, { foreignKey: "schoolId", as: "timetables" });

export default Timetable;
