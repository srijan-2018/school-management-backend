import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";

class SchoolCalendar extends Model {
  public id!: number;
  public schoolId!: number;
  public title!: string;
  public type!: "holiday" | "event";
  public startDate!: string;
  public endDate!: string;
  public description?: string | null;
  public isAllDay!: boolean;
}

SchoolCalendar.init(
  {
    schoolId: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    type: {
      type: DataTypes.ENUM("holiday", "event"),
      allowNull: false,
      defaultValue: "event",
    },
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: { type: DataTypes.DATEONLY, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    isAllDay: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: "SchoolCalendar",
    tableName: "SchoolCalendars",
    timestamps: true,
  },
);

SchoolCalendar.belongsTo(School, { foreignKey: "schoolId" });
School.hasMany(SchoolCalendar, {
  foreignKey: "schoolId",
  as: "calendarItems",
});

export default SchoolCalendar;
