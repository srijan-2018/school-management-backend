"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = require("../config/db");
const class_model_1 = __importDefault(require("./class.model"));
const subject_model_1 = __importDefault(require("./subject.model"));
class Exam extends sequelize_1.Model {
}
Exam.init({
    name: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    classId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    subjectId: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    date: { type: sequelize_1.DataTypes.DATEONLY, allowNull: true },
    totalMarks: { type: sequelize_1.DataTypes.FLOAT, allowNull: true },
}, { sequelize: db_1.sequelize, modelName: "Exam", timestamps: true });
Exam.belongsTo(class_model_1.default, { foreignKey: "classId" });
Exam.belongsTo(subject_model_1.default, { foreignKey: "subjectId" });
exports.default = Exam;
