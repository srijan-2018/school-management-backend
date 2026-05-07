import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

class Class extends Model {
  public id!: number;
  public name!: string;
  public section!: string;
}

Class.init(
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    section: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Class",
    timestamps: true,
  },
);

export default Class;
