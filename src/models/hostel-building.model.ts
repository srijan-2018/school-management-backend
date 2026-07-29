import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";

class HostelBuilding extends Model {
  public id!: number;
  public schoolId!: number;
}

HostelBuilding.init(
  {
    schoolId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    gender: {
      type: DataTypes.ENUM("male", "female", "mixed"),
      defaultValue: "mixed",
    },
    address: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize,
    modelName: "HostelBuilding",
    tableName: "HostelBuildings",
    timestamps: true,
  },
);

HostelBuilding.belongsTo(School, { foreignKey: "schoolId" });
School.hasMany(HostelBuilding, { foreignKey: "schoolId", as: "hostelBuildings" });

export default HostelBuilding;
