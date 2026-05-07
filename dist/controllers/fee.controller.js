"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
const getFeesByStudent = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const fees = yield fee_model_1.default.findAll({ where: { studentId: req.params.id } });
        res.json({ fees });
    }
    catch (err) {
        next(err);
    }
});
exports.getFeesByStudent = getFeesByStudent;
const createFeePayment = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const payment = yield fee_payment_model_1.default.create((_a = req.body) !== null && _a !== void 0 ? _a : {});
        if (payment.status === "success") {
            yield fee_model_1.default.update({ status: "paid" }, { where: { id: payment.feeId } });
        }
        res.status(201).json({
            message: "payment created successfully",
            payment,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.createFeePayment = createFeePayment;
const getFeeDefaulters = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const fees = yield fee_model_1.default.findAll({
            where: { status: ["pending", "partial", "overdue"] },
        });
        res.json({ defaulters: fees });
    }
    catch (err) {
        next(err);
    }
});
exports.getFeeDefaulters = getFeeDefaulters;
