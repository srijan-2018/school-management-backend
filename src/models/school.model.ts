import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

class School extends Model {
  public id!: number;
  public name!: string;
}

School.init(
  {
    name: { type: DataTypes.STRING, allowNull: false },
    code: { type: DataTypes.STRING, allowNull: true, unique: true },
    email: { type: DataTypes.STRING, allowNull: true },
    phone: { type: DataTypes.STRING, allowNull: true },
    address: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: "School", timestamps: true },
);

export default School;
