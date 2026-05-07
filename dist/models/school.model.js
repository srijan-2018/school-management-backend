"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = require("../config/db");
class School extends sequelize_1.Model {
}
School.init({
    name: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    code: { type: sequelize_1.DataTypes.STRING, allowNull: true, unique: true },
    email: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    phone: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    address: { type: sequelize_1.DataTypes.STRING, allowNull: true },
}, { sequelize: db_1.sequelize, modelName: "School", timestamps: true });
exports.default = School;
