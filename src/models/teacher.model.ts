import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import User from "./user.model";

class Teacher extends Model {
  public id!: number;
  public userId!: number;
}

Teacher.init(
  {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    employeeId: { type: DataTypes.STRING, allowNull: true, unique: true },
    qualification: { type: DataTypes.STRING, allowNull: true },
    phone: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: "Teacher", timestamps: true },
);

Teacher.belongsTo(User, { foreignKey: "userId" });
User.hasOne(Teacher, { foreignKey: "userId" });

export default Teacher;
