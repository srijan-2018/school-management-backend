"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = require("../config/db");
class Timetable extends sequelize_1.Model {
}
Timetable.init({
    classId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    sectionId: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    subjectId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    teacherId: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    day: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    startTime: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    endTime: { type: sequelize_1.DataTypes.STRING, allowNull: false },
}, { sequelize: db_1.sequelize, modelName: "Timetable", timestamps: true });
exports.default = Timetable;
