import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";

class TransportAssignment extends Model {
  public id!: number;
  public schoolId!: number;
}

TransportAssignment.init(
  {
    schoolId: { type: DataTypes.INTEGER, allowNull: false },
    studentId: { type: DataTypes.INTEGER, allowNull: false },
    routeId: { type: DataTypes.INTEGER, allowNull: false },
    stopName: { type: DataTypes.STRING, allowNull: true },
    pickupTime: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize,
    modelName: "TransportAssignment",
    tableName: "TransportAssignments",
    timestamps: true,
  },
);

TransportAssignment.belongsTo(School, { foreignKey: "schoolId" });
School.hasMany(TransportAssignment, {
  foreignKey: "schoolId",
  as: "transportAssignments",
});

export default TransportAssignment;
