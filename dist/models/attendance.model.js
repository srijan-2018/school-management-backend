"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = require("../config/db");
const student_model_1 = __importDefault(require("./student.model"));
const class_model_1 = __importDefault(require("./class.model"));
class Attendance extends sequelize_1.Model {
}
Attendance.init({
    studentId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    classId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    date: { type: sequelize_1.DataTypes.DATEONLY, allowNull: false },
    status: {
        type: sequelize_1.DataTypes.ENUM("present", "absent", "late", "half_day"),
        allowNull: false,
    },
    remarks: { type: sequelize_1.DataTypes.STRING, allowNull: true },
}, { sequelize: db_1.sequelize, modelName: "Attendance", timestamps: true });
Attendance.belongsTo(student_model_1.default, { foreignKey: "studentId" });
Attendance.belongsTo(class_model_1.default, { foreignKey: "classId" });
exports.default = Attendance;
