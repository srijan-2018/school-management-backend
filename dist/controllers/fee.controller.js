"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFeeDefaulters = exports.createFeePayment = exports.getFeesByStudent = exports.getFeeTransactions = exports.createFee = void 0;
const fee_model_1 = __importDefault(require("../models/fee.model"));
const fee_payment_model_1 = __importDefault(require("../models/fee-payment.model"));
const crud_helpers_1 = require("./crud.helpers");
exports.createFee = (0, crud_helpers_1.create)(fee_model_1.default, "fee");
exports.getFeeTransactions = (0, crud_helpers_1.list)(fee_payment_model_1.default, "transactions");
const getFeesByStudent = async (req, res, next) => {
    try {
        const fees = await fee_model_1.default.findAll({ where: { studentId: req.params.id } });
        res.json({ fees });
    }
    catch (err) {
        next(err);
    }
};
exports.getFeesByStudent = getFeesByStudent;
const createFeePayment = async (req, res, next) => {
    try {
        const payment = await fee_payment_model_1.default.create(req.body ?? {});
        if (payment.status === "success") {
            await fee_model_1.default.update({ status: "paid" }, { where: { id: payment.feeId } });
        }
        res.status(201).json({
            message: "payment created successfully",
            payment,
        });
    }
    catch (err) {
        next(err);
    }
};
exports.createFeePayment = createFeePayment;
const getFeeDefaulters = async (req, res, next) => {
    try {
        const fees = await fee_model_1.default.findAll({
            where: { status: ["pending", "partial", "overdue"] },
        });
        res.json({ defaulters: fees });
    }
    catch (err) {
        next(err);
    }
};
exports.getFeeDefaulters = getFeeDefaulters;
