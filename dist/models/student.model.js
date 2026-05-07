"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = require("../config/db");
const user_model_1 = __importDefault(require("./user.model"));
const class_model_1 = __importDefault(require("./class.model"));
class Student extends sequelize_1.Model {
}
Student.init({
    userId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    classId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    rollNumber: sequelize_1.DataTypes.STRING,
}, {
    sequelize: db_1.sequelize,
    modelName: "Student",
    timestamps: true,
});
// 🔗 Relations
Student.belongsTo(user_model_1.default, { foreignKey: "userId" });
Student.belongsTo(class_model_1.default, { foreignKey: "classId" });
exports.default = Student;
