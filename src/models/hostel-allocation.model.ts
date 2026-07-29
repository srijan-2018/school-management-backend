import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";
import HostelRoom from "./hostel-room.model";

class HostelAllocation extends Model {
  public id!: number;
  public schoolId!: number;
}

HostelAllocation.init(
  {
    schoolId: { type: DataTypes.INTEGER, allowNull: false },
    roomId: { type: DataTypes.INTEGER, allowNull: false },
    studentId: { type: DataTypes.INTEGER, allowNull: false },
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: { type: DataTypes.DATEONLY, allowNull: true },
    status: {
      type: DataTypes.ENUM("active", "ended"),
      defaultValue: "active",
    },
  },
  {
    sequelize,
    modelName: "HostelAllocation",
    tableName: "HostelAllocations",
    timestamps: true,
  },
);

HostelAllocation.belongsTo(School, { foreignKey: "schoolId" });
HostelAllocation.belongsTo(HostelRoom, { foreignKey: "roomId", as: "room" });
HostelRoom.hasMany(HostelAllocation, { foreignKey: "roomId", as: "allocations" });
School.hasMany(HostelAllocation, {
  foreignKey: "schoolId",
  as: "hostelAllocations",
});

export default HostelAllocation;
