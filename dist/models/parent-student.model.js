"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = require("../config/db");
const parent_model_1 = __importDefault(require("./parent.model"));
const student_model_1 = __importDefault(require("./student.model"));
class ParentStudent extends sequelize_1.Model {
}
ParentStudent.init({
    parentId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    studentId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
}, {
    sequelize: db_1.sequelize,
    modelName: "ParentStudent",
    timestamps: true,
    indexes: [{ unique: true, fields: ["parentId", "studentId"] }],
});
parent_model_1.default.belongsToMany(student_model_1.default, { through: ParentStudent, foreignKey: "parentId" });
student_model_1.default.belongsToMany(parent_model_1.default, { through: ParentStudent, foreignKey: "studentId" });
exports.default = ParentStudent;
