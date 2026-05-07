"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = require("../config/db");
const role_model_1 = __importDefault(require("./role.model"));
const permission_model_1 = __importDefault(require("./permission.model"));
class RolePermission extends sequelize_1.Model {
}
RolePermission.init({
    roleId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    permissionId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
}, {
    sequelize: db_1.sequelize,
    modelName: "RolePermission",
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ["roleId", "permissionId"],
        },
    ],
});
role_model_1.default.belongsToMany(permission_model_1.default, {
    through: RolePermission,
    foreignKey: "roleId",
});
permission_model_1.default.belongsToMany(role_model_1.default, {
    through: RolePermission,
    foreignKey: "permissionId",
});
RolePermission.belongsTo(role_model_1.default, { foreignKey: "roleId" });
RolePermission.belongsTo(permission_model_1.default, { foreignKey: "permissionId" });
exports.default = RolePermission;
