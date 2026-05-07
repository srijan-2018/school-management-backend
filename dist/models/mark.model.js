"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = require("../config/db");
const exam_model_1 = __importDefault(require("./exam.model"));
const student_model_1 = __importDefault(require("./student.model"));
class Mark extends sequelize_1.Model {
}
Mark.init({
    examId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    studentId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    marks: { type: sequelize_1.DataTypes.FLOAT, allowNull: false },
    grade: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    remarks: { type: sequelize_1.DataTypes.STRING, allowNull: true },
}, { sequelize: db_1.sequelize, modelName: "Mark", timestamps: true });
Mark.belongsTo(exam_model_1.default, { foreignKey: "examId" });
Mark.belongsTo(student_model_1.default, { foreignKey: "studentId" });
exports.default = Mark;
