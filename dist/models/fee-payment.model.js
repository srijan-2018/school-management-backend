"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = require("../config/db");
const fee_model_1 = __importDefault(require("./fee.model"));
const student_model_1 = __importDefault(require("./student.model"));
class FeePayment extends sequelize_1.Model {
}
FeePayment.init({
    feeId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    studentId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    amount: { type: sequelize_1.DataTypes.FLOAT, allowNull: false },
    method: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    transactionId: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    status: {
        type: sequelize_1.DataTypes.ENUM("success", "failed", "pending"),
        defaultValue: "success",
    },
}, { sequelize: db_1.sequelize, modelName: "FeePayment", timestamps: true });
FeePayment.belongsTo(fee_model_1.default, { foreignKey: "feeId" });
FeePayment.belongsTo(student_model_1.default, { foreignKey: "studentId" });
exports.default = FeePayment;
