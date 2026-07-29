import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";
import HostelBuilding from "./hostel-building.model";

class HostelRoom extends Model {
  public id!: number;
  public schoolId!: number;
  public occupied!: number;
  public capacity!: number;
}

HostelRoom.init(
  {
    schoolId: { type: DataTypes.INTEGER, allowNull: false },
    buildingId: { type: DataTypes.INTEGER, allowNull: false },
    roomNumber: { type: DataTypes.STRING, allowNull: false },
    capacity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    occupied: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    monthlyCharge: { type: DataTypes.FLOAT, allowNull: true },
  },
  {
    sequelize,
    modelName: "HostelRoom",
    tableName: "HostelRooms",
    timestamps: true,
  },
);

HostelRoom.belongsTo(School, { foreignKey: "schoolId" });
HostelRoom.belongsTo(HostelBuilding, { foreignKey: "buildingId", as: "building" });
HostelBuilding.hasMany(HostelRoom, { foreignKey: "buildingId", as: "rooms" });
School.hasMany(HostelRoom, { foreignKey: "schoolId", as: "hostelRooms" });

export default HostelRoom;
