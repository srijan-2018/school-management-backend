import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import User from "./user.model";
import Class from "./class.model";

class Student extends Model {
  public id!: number;
  public userId!: number;
  public classId!: number;
  public rollNumber!: string;
}

Student.init(
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    classId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    rollNumber: DataTypes.STRING,
  },
  {
    sequelize,
    modelName: "Student",
    timestamps: true,
  },
);

// 🔗 Relations
Student.belongsTo(User, { foreignKey: "userId" });
Student.belongsTo(Class, { foreignKey: "classId" });

export default Student;
