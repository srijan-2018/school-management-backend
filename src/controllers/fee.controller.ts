import { NextFunction, Request, Response } from "express";
import Fee from "../models/fee.model";
import FeePayment from "../models/fee-payment.model";
import { create, list } from "../helpers/crud.helpers";

export const createFee = create(Fee, "fee");
export const getFeeTransactions = list(FeePayment, "transactions");

export const getFeesByStudent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const fees = await Fee.findAll({ where: { studentId: req.params.id } });
    res.json({ fees });
  } catch (err) {
    next(err);
  }
};

export const createFeePayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const payment: any = await FeePayment.create(req.body ?? {});

    if (payment.status === "success") {
      await Fee.update({ status: "paid" }, { where: { id: payment.feeId } });
    }

    res.status(201).json({
      message: "payment created successfully",
      payment,
    });
  } catch (err) {
    next(err);
  }
};

export const getFeeDefaulters = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const fees = await Fee.findAll({
      where: { status: ["pending", "partial", "overdue"] },
    });
    res.json({ defaulters: fees });
  } catch (err) {
    next(err);
  }
};
