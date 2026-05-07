"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = require("../config/db");
const class_model_1 = __importDefault(require("./class.model"));
class Subject extends sequelize_1.Model {
}
Subject.init({
    name: sequelize_1.DataTypes.STRING,
    classId: sequelize_1.DataTypes.INTEGER,
}, {
    sequelize: db_1.sequelize,
    modelName: "Subject",
    timestamps: true,
});
Subject.belongsTo(class_model_1.default, { foreignKey: "classId" });
exports.default = Subject;
