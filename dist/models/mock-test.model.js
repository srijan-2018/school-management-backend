"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = require("../config/db");
class MockTest extends sequelize_1.Model {
}
MockTest.init({
    studentId: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    subjectId: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    title: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    questions: { type: sequelize_1.DataTypes.JSON, allowNull: true },
    submittedAnswers: { type: sequelize_1.DataTypes.JSON, allowNull: true },
    result: { type: sequelize_1.DataTypes.JSON, allowNull: true },
    aiSuggestion: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    status: {
        type: sequelize_1.DataTypes.ENUM("generated", "submitted", "evaluated"),
        defaultValue: "generated",
    },
}, { sequelize: db_1.sequelize, modelName: "MockTest", timestamps: true });
exports.default = MockTest;
