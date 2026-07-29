import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import Student from "./student.model";
import School from "./school.model";

class Fee extends Model {
  public id!: number;
  public schoolId?: number | null;
}

Fee.init(
  {
    studentId: { type: DataTypes.INTEGER, allowNull: false },
    schoolId: { type: DataTypes.INTEGER, allowNull: true },
    title: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    dueDate: { type: DataTypes.DATEONLY, allowNull: true },
    month: { type: DataTypes.INTEGER, allowNull: true },
    year: { type: DataTypes.INTEGER, allowNull: true },
    concessionAmount: { type: DataTypes.FLOAT, allowNull: true, defaultValue: 0 },
    waiverAmount: { type: DataTypes.FLOAT, allowNull: true, defaultValue: 0 },
    invoiceNumber: { type: DataTypes.STRING, allowNull: true },
    status: {
      type: DataTypes.ENUM("pending", "paid", "partial", "overdue", "waived"),
      defaultValue: "pending",
    },
  },
  { sequelize, modelName: "Fee", timestamps: true },
);

Fee.belongsTo(Student, { foreignKey: "studentId" });
Fee.belongsTo(School, { foreignKey: "schoolId" });
School.hasMany(Fee, { foreignKey: "schoolId", as: "fees" });

export default Fee;
