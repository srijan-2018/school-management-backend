import { NextFunction, Request, Response } from "express";
import Fee from "../models/fee.model";
import FeePayment from "../models/fee-payment.model";
import { create, list } from "../helpers/crud.helpers";
import { buildPagination, getPagination } from "../utils/pagination";

export const createFee = create(Fee, "fee");
export const getFeeTransactions = list(FeePayment, "transactions");

export const getFeesByStudent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { rows: fees, count } = await Fee.findAndCountAll({
      where: { studentId: req.params.id },
      limit,
      offset,
    });
    res.json({
      fees,
      pagination: buildPagination(page, limit, count),
    });
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
    const { page, limit, offset } = getPagination(req);
    const { rows: fees, count } = await Fee.findAndCountAll({
      where: { status: ["pending", "partial", "overdue"] },
      limit,
      offset,
    });
    res.json({
      defaulters: fees,
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};
