"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = require("../config/db");
class Assignment extends sequelize_1.Model {
}
Assignment.init({
    title: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    classId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    subjectId: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    teacherId: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    dueDate: { type: sequelize_1.DataTypes.DATEONLY, allowNull: true },
}, { sequelize: db_1.sequelize, modelName: "Assignment", timestamps: true });
exports.default = Assignment;
