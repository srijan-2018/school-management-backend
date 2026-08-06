import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";
import User from "./user.model";

class TransportVehicle extends Model {
  public id!: number;
  public schoolId!: number;
  public plateNumber!: string;
  public capacity?: number | null;
  public driverUserId?: number | null;
  public driverName?: string | null;
  public driverPhone?: string | null;
  public status!: "active" | "maintenance" | "inactive";
}

TransportVehicle.init(
  {
    schoolId: { type: DataTypes.INTEGER, allowNull: false },
    plateNumber: { type: DataTypes.STRING, allowNull: false },
    capacity: { type: DataTypes.INTEGER, allowNull: true },
    driverUserId: { type: DataTypes.INTEGER, allowNull: true },
    driverName: { type: DataTypes.STRING, allowNull: true },
    driverPhone: { type: DataTypes.STRING, allowNull: true },
    status: {
      type: DataTypes.ENUM("active", "maintenance", "inactive"),
      defaultValue: "active",
    },
  },
  {
    sequelize,
    modelName: "TransportVehicle",
    tableName: "TransportVehicles",
    timestamps: true,
  },
);

TransportVehicle.belongsTo(School, { foreignKey: "schoolId" });
School.hasMany(TransportVehicle, { foreignKey: "schoolId", as: "vehicles" });
TransportVehicle.belongsTo(User, {
  foreignKey: "driverUserId",
  as: "driverUser",
});

export default TransportVehicle;
