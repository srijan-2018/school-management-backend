"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = require("../config/db");
const student_model_1 = __importDefault(require("./student.model"));
class StudentDocument extends sequelize_1.Model {
}
StudentDocument.init({
    studentId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    name: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    type: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    url: { type: sequelize_1.DataTypes.STRING, allowNull: false },
}, { sequelize: db_1.sequelize, modelName: "StudentDocument", timestamps: true });
StudentDocument.belongsTo(student_model_1.default, { foreignKey: "studentId" });
exports.default = StudentDocument;
