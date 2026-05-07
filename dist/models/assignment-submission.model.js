"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = require("../config/db");
const assignment_model_1 = __importDefault(require("./assignment.model"));
const student_model_1 = __importDefault(require("./student.model"));
class AssignmentSubmission extends sequelize_1.Model {
}
AssignmentSubmission.init({
    assignmentId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    studentId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    fileUrl: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    remarks: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    status: {
        type: sequelize_1.DataTypes.ENUM("submitted", "reviewed", "rejected"),
        defaultValue: "submitted",
    },
}, { sequelize: db_1.sequelize, modelName: "AssignmentSubmission", timestamps: true });
AssignmentSubmission.belongsTo(assignment_model_1.default, { foreignKey: "assignmentId" });
AssignmentSubmission.belongsTo(student_model_1.default, { foreignKey: "studentId" });
exports.default = AssignmentSubmission;
