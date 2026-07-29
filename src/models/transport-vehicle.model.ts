import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";

class TransportVehicle extends Model {
  public id!: number;
  public schoolId!: number;
}

TransportVehicle.init(
  {
    schoolId: { type: DataTypes.INTEGER, allowNull: false },
    plateNumber: { type: DataTypes.STRING, allowNull: false },
    capacity: { type: DataTypes.INTEGER, allowNull: true },
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

export default TransportVehicle;
