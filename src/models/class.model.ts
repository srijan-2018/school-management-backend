import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";

class Class extends Model {
  public id!: number;
  public name!: string;
  public section?: string | null;
  public schoolId!: number;
}

Class.init(
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    section: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    schoolId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Class",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["schoolId", "name"],
        name: "classes_school_name_unique",
      },
    ],
  },
);

Class.belongsTo(School, { foreignKey: "schoolId" });
School.hasMany(Class, { foreignKey: "schoolId", as: "classes" });

export default Class;
