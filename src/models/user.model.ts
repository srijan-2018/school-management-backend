import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import { USER_ROLES, type UserRole } from "../utils/roles";

class User extends Model {
  public id!: number;
  public name!: string;
  public email!: string;
  public password!: string;
  public role!: UserRole;
}

User.init(
  {
    name: DataTypes.STRING,
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM(...USER_ROLES),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "User",
  },
);

export default User;
