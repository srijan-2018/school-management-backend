import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";
import User from "./user.model";

class StaffProfile extends Model {
  public id!: number;
  public schoolId!: number;
}

StaffProfile.init(
  {
    schoolId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    employeeCode: { type: DataTypes.STRING, allowNull: true },
    department: { type: DataTypes.STRING, allowNull: true },
    designation: { type: DataTypes.STRING, allowNull: true },
    joinDate: { type: DataTypes.DATEONLY, allowNull: true },
    salary: { type: DataTypes.FLOAT, allowNull: true },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      defaultValue: "active",
    },
  },
  {
    sequelize,
    modelName: "StaffProfile",
    tableName: "StaffProfiles",
    timestamps: true,
  },
);

StaffProfile.belongsTo(School, { foreignKey: "schoolId" });
StaffProfile.belongsTo(User, { foreignKey: "userId" });
School.hasMany(StaffProfile, { foreignKey: "schoolId", as: "staffProfiles" });

export default StaffProfile;
