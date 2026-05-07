import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import Role from "./role.model";
import Permission from "./permission.model";

class RolePermission extends Model {
  public id!: number;
  public roleId!: number;
  public permissionId!: number;
}

RolePermission.init(
  {
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    permissionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "RolePermission",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["roleId", "permissionId"],
      },
    ],
  },
);

Role.belongsToMany(Permission, {
  through: RolePermission,
  foreignKey: "roleId",
});

Permission.belongsToMany(Role, {
  through: RolePermission,
  foreignKey: "permissionId",
});

RolePermission.belongsTo(Role, { foreignKey: "roleId" });
RolePermission.belongsTo(Permission, { foreignKey: "permissionId" });

export default RolePermission;
