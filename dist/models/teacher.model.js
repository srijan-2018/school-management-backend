"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = require("../config/db");
const user_model_1 = __importDefault(require("./user.model"));
class Teacher extends sequelize_1.Model {
}
Teacher.init({
    userId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    employeeId: { type: sequelize_1.DataTypes.STRING, allowNull: true, unique: true },
    qualification: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    phone: { type: sequelize_1.DataTypes.STRING, allowNull: true },
}, { sequelize: db_1.sequelize, modelName: "Teacher", timestamps: true });
Teacher.belongsTo(user_model_1.default, { foreignKey: "userId" });
user_model_1.default.hasOne(Teacher, { foreignKey: "userId" });
exports.default = Teacher;
