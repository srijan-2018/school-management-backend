"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = require("../config/db");
const teacher_model_1 = __importDefault(require("./teacher.model"));
const class_model_1 = __importDefault(require("./class.model"));
class TeacherClass extends sequelize_1.Model {
}
TeacherClass.init({
    teacherId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    classId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
}, {
    sequelize: db_1.sequelize,
    modelName: "TeacherClass",
    timestamps: true,
    indexes: [{ unique: true, fields: ["teacherId", "classId"] }],
});
teacher_model_1.default.belongsToMany(class_model_1.default, { through: TeacherClass, foreignKey: "teacherId" });
class_model_1.default.belongsToMany(teacher_model_1.default, { through: TeacherClass, foreignKey: "classId" });
exports.default = TeacherClass;
