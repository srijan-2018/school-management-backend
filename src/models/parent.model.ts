import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import User from "./user.model";

class Parent extends Model {
  public id!: number;
  public userId!: number;
}

Parent.init(
  {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: true },
    address: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: "Parent", timestamps: true },
);

Parent.belongsTo(User, { foreignKey: "userId" });
User.hasOne(Parent, { foreignKey: "userId" });

export default Parent;
