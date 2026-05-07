"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = require("../config/db");
const student_model_1 = __importDefault(require("./student.model"));
class Fee extends sequelize_1.Model {
}
Fee.init({
    studentId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    title: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    amount: { type: sequelize_1.DataTypes.FLOAT, allowNull: false },
    dueDate: { type: sequelize_1.DataTypes.DATEONLY, allowNull: true },
    status: {
        type: sequelize_1.DataTypes.ENUM("pending", "paid", "partial", "overdue"),
        defaultValue: "pending",
    },
}, { sequelize: db_1.sequelize, modelName: "Fee", timestamps: true });
Fee.belongsTo(student_model_1.default, { foreignKey: "studentId" });
exports.default = Fee;
