import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";
import TransportVehicle from "./transport-vehicle.model";

class TransportRoute extends Model {
  public id!: number;
  public schoolId!: number;
  public name!: string;
  public vehicleId?: number | null;
  public stops?: unknown;
  public fare?: number | null;
  public status!: "active" | "inactive";
}

TransportRoute.init(
  {
    schoolId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    vehicleId: { type: DataTypes.INTEGER, allowNull: true },
    stops: { type: DataTypes.JSON, allowNull: true },
    fare: { type: DataTypes.FLOAT, allowNull: true },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      defaultValue: "active",
    },
  },
  {
    sequelize,
    modelName: "TransportRoute",
    tableName: "TransportRoutes",
    timestamps: true,
  },
);

TransportRoute.belongsTo(School, { foreignKey: "schoolId" });
School.hasMany(TransportRoute, { foreignKey: "schoolId", as: "routes" });
TransportRoute.belongsTo(TransportVehicle, {
  foreignKey: "vehicleId",
  as: "vehicle",
});
TransportVehicle.hasMany(TransportRoute, {
  foreignKey: "vehicleId",
  as: "routes",
});

export default TransportRoute;
