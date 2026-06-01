import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import { USER_ROLES, type UserRole } from "../utils/roles";
import School from "./school.model";

class User extends Model {
  public id!: number;
  public name!: string;
  public email!: string;
  public password!: string;
  public role!: UserRole;
  public schoolId?: number | null;
  public resetPasswordToken?: string | null;
  public resetPasswordExpires?: Date | null;
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
    schoolId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "User",
  },
);

User.belongsTo(School, { foreignKey: "schoolId" });
School.hasMany(User, { foreignKey: "schoolId", as: "users" });

export default User;
