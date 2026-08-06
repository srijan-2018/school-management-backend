import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import TransportTrip from "./transport-trip.model";

class TransportTripLocation extends Model {
  public id!: number;
  public tripId!: number;
  public lat!: number;
  public lng!: number;
  public speed?: number | null;
  public heading?: number | null;
  public accuracy?: number | null;
  public recordedAt!: Date;
}

TransportTripLocation.init(
  {
    tripId: { type: DataTypes.INTEGER, allowNull: false },
    lat: { type: DataTypes.FLOAT, allowNull: false },
    lng: { type: DataTypes.FLOAT, allowNull: false },
    speed: { type: DataTypes.FLOAT, allowNull: true },
    heading: { type: DataTypes.FLOAT, allowNull: true },
    accuracy: { type: DataTypes.FLOAT, allowNull: true },
    recordedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "TransportTripLocation",
    tableName: "TransportTripLocations",
    timestamps: true,
    updatedAt: false,
  },
);

TransportTripLocation.belongsTo(TransportTrip, {
  foreignKey: "tripId",
  as: "trip",
});
TransportTrip.hasMany(TransportTripLocation, {
  foreignKey: "tripId",
  as: "locations",
});

export default TransportTripLocation;
