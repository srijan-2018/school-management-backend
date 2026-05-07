import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import Class from "./class.model";

class Subject extends Model {
  public id!: number;
  public name!: string;
  public classId!: number;
}

Subject.init(
  {
    name: DataTypes.STRING,
    classId: DataTypes.INTEGER,
  },
  {
    sequelize,
    modelName: "Subject",
    timestamps: true,
  },
);

Subject.belongsTo(Class, { foreignKey: "classId" });

export default Subject;
