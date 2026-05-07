"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = require("../config/db");
const class_model_1 = __importDefault(require("./class.model"));
class Section extends sequelize_1.Model {
}
Section.init({
    name: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    classId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
}, { sequelize: db_1.sequelize, modelName: "Section", timestamps: true });
Section.belongsTo(class_model_1.default, { foreignKey: "classId" });
class_model_1.default.hasMany(Section, { foreignKey: "classId" });
exports.default = Section;
