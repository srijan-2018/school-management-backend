"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = exports.sequelize = void 0;
const sequelize_1 = require("sequelize");
exports.sequelize = new sequelize_1.Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    dialect: "mysql",
    logging: false,
});
const connectDB = async () => {
    try {
        await exports.sequelize.authenticate();
        console.log("Database connected ✅");
    }
    catch (error) {
        console.error("DB Error ❌:", error.message);
    }
};
exports.connectDB = connectDB;
