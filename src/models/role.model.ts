import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

class Role extends Model {
  public id!: number;
  public name!: string;
  public description?: string;
}

Role.init(
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
    modelName: "Role",
    timestamps: true,
  },
);

export default Role;
