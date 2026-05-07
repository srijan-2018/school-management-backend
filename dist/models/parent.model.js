"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = require("../config/db");
const user_model_1 = __importDefault(require("./user.model"));
class Parent extends sequelize_1.Model {
}
Parent.init({
    userId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    phone: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    address: { type: sequelize_1.DataTypes.STRING, allowNull: true },
}, { sequelize: db_1.sequelize, modelName: "Parent", timestamps: true });
Parent.belongsTo(user_model_1.default, { foreignKey: "userId" });
user_model_1.default.hasOne(Parent, { foreignKey: "userId" });
exports.default = Parent;
