import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import Student from "./student.model";

class Fee extends Model {
  public id!: number;
}

Fee.init(
  {
    studentId: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    dueDate: { type: DataTypes.DATEONLY, allowNull: true },
    status: {
      type: DataTypes.ENUM("pending", "paid", "partial", "overdue"),
      defaultValue: "pending",
    },
  },
  { sequelize, modelName: "Fee", timestamps: true },
);

Fee.belongsTo(Student, { foreignKey: "studentId" });

export default Fee;
