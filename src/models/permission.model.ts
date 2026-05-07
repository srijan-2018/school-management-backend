import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

class Permission extends Model {
  public id!: number;
  public name!: string;
  public description?: string;
}

Permission.init(
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Permission",
    timestamps: true,
  },
);

export default Permission;
