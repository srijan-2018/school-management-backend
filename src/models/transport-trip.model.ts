import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";
import User from "./user.model";
import TransportVehicle from "./transport-vehicle.model";
import TransportRoute from "./transport-route.model";

export type TransportTripDirection = "pickup" | "dropoff";
export type TransportTripStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

class TransportTrip extends Model {
  public id!: number;
  public schoolId!: number;
  public routeId?: number | null;
  public vehicleId!: number;
  public driverUserId!: number;
  public direction!: TransportTripDirection;
  public status!: TransportTripStatus;
  public startLat?: number | null;
  public startLng?: number | null;
  public endLat?: number | null;
  public endLng?: number | null;
  public endAddress?: string | null;
  public currentLat?: number | null;
  public currentLng?: number | null;
  public locationUpdatedAt?: Date | null;
  public startedAt?: Date | null;
  public completedAt?: Date | null;
  public notes?: string | null;
}

TransportTrip.init(
  {
    schoolId: { type: DataTypes.INTEGER, allowNull: false },
    routeId: { type: DataTypes.INTEGER, allowNull: true },
    vehicleId: { type: DataTypes.INTEGER, allowNull: false },
    driverUserId: { type: DataTypes.INTEGER, allowNull: false },
    direction: {
      type: DataTypes.ENUM("pickup", "dropoff"),
      allowNull: false,
      defaultValue: "pickup",
    },
    status: {
      type: DataTypes.ENUM(
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
      ),
      allowNull: false,
      defaultValue: "in_progress",
    },
    startLat: { type: DataTypes.FLOAT, allowNull: true },
    startLng: { type: DataTypes.FLOAT, allowNull: true },
    endLat: { type: DataTypes.FLOAT, allowNull: true },
    endLng: { type: DataTypes.FLOAT, allowNull: true },
    endAddress: { type: DataTypes.STRING, allowNull: true },
    currentLat: { type: DataTypes.FLOAT, allowNull: true },
    currentLng: { type: DataTypes.FLOAT, allowNull: true },
    locationUpdatedAt: { type: DataTypes.DATE, allowNull: true },
    startedAt: { type: DataTypes.DATE, allowNull: true },
    completedAt: { type: DataTypes.DATE, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    modelName: "TransportTrip",
    tableName: "TransportTrips",
    timestamps: true,
  },
);

TransportTrip.belongsTo(School, { foreignKey: "schoolId" });
School.hasMany(TransportTrip, { foreignKey: "schoolId", as: "transportTrips" });
TransportTrip.belongsTo(TransportVehicle, {
  foreignKey: "vehicleId",
  as: "vehicle",
});
TransportTrip.belongsTo(TransportRoute, {
  foreignKey: "routeId",
  as: "route",
});
TransportTrip.belongsTo(User, {
  foreignKey: "driverUserId",
  as: "driver",
});

export default TransportTrip;
