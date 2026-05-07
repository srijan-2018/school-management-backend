import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import Fee from "./fee.model";
import Student from "./student.model";

class FeePayment extends Model {
  public id!: number;
}

FeePayment.init(
  {
    feeId: { type: DataTypes.INTEGER, allowNull: false },
    studentId: { type: DataTypes.INTEGER, allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    method: { type: DataTypes.STRING, allowNull: true },
    transactionId: { type: DataTypes.STRING, allowNull: true },
    status: {
      type: DataTypes.ENUM("success", "failed", "pending"),
      defaultValue: "success",
    },
  },
  { sequelize, modelName: "FeePayment", timestamps: true },
);

FeePayment.belongsTo(Fee, { foreignKey: "feeId" });
FeePayment.belongsTo(Student, { foreignKey: "studentId" });

export default FeePayment;
