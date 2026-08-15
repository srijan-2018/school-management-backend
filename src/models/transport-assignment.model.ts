import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";
import Student from "./student.model";
import TransportRoute from "./transport-route.model";

class TransportAssignment extends Model {
  public id!: number;
  public schoolId!: number;
  public studentId!: number;
  public routeId!: number;
  public stopName?: string | null;
  public pickupTime?: string | null;
  public sortOrder!: number;
}

TransportAssignment.init(
  {
    schoolId: { type: DataTypes.INTEGER, allowNull: false },
    studentId: { type: DataTypes.INTEGER, allowNull: false },
    routeId: { type: DataTypes.INTEGER, allowNull: false },
    stopName: { type: DataTypes.STRING, allowNull: true },
    pickupTime: { type: DataTypes.STRING, allowNull: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
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
TransportAssignment.belongsTo(Student, {
  foreignKey: "studentId",
  as: "student",
});
TransportAssignment.belongsTo(TransportRoute, {
  foreignKey: "routeId",
  as: "route",
});
TransportRoute.hasMany(TransportAssignment, {
  foreignKey: "routeId",
  as: "assignments",
});

export default TransportAssignment;
