import { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import { sequelize } from "../config/db";
import Fee from "../models/fee.model";
import FeePayment from "../models/fee-payment.model";
import Class from "../models/class.model";
import Parent from "../models/parent.model";
import Section from "../models/section.model";
import Student from "../models/student.model";
import User from "../models/user.model";
import { AppError } from "../middlewares/error.middleware";
import { buildPagination, getPagination } from "../utils/pagination";
import { normalizeRole } from "../utils/roles";

const defaulterStatuses = ["pending", "partial", "overdue"];

const userSafeAttributes = {
  exclude: ["password", "resetPasswordToken", "resetPasswordExpires"],
};

const getActor = (req: Request) => {
  const role = normalizeRole((req as any).user?.role);
  const schoolId = Number((req as any).user?.schoolId);

  if (!role) {
    throw new AppError("Access denied", 403);
  }

  return {
    role,
    schoolId: Number.isInteger(schoolId) && schoolId > 0 ? schoolId : null,
  };
};

const ensureSchoolOwnerCanAccessStudent = (req: Request, studentUser: any) => {
  const actor = getActor(req);

  if (actor.role !== "school_owner") {
    return;
  }

  if (!actor.schoolId) {
    throw new AppError("school_owner is not attached to any school", 400);
  }

  if (Number(studentUser?.schoolId ?? 0) !== actor.schoolId) {
    throw new AppError("Access denied", 403);
  }
};

const getFeeWithStudentDetails = (feeId: number | string) =>
  Fee.findByPk(String(feeId), {
    include: [
      {
        model: Student,
        required: true,
        include: [
          {
            model: User,
            required: true,
            attributes: userSafeAttributes,
          },
          {
            model: Class,
            attributes: ["id", "name"],
          },
          {
            model: Section,
            attributes: ["id", "name"],
          },
          {
            model: Parent,
            through: { attributes: [] },
            include: [
              {
                model: User,
                attributes: userSafeAttributes,
              },
            ],
          },
        ],
      },
    ],
  });

const normalizePhoneForWhatsapp = (phone: unknown) => {
  const digits = String(phone ?? "").replace(/\D/g, "");

  return digits.length >= 10 ? digits : null;
};

const buildDefaultFeeReminderMessage = (fee: any) => {
  const studentName = fee.Student?.User?.name ?? "your child";
  const title = fee.title ?? "school fee";
  const amount = fee.amount ?? 0;
  const dueDate = fee.dueDate ? ` Due date: ${fee.dueDate}.` : "";

  return `Dear Parent, this is a reminder that ${studentName}'s ${title} of ${amount} is still pending.${dueDate} Please complete the payment as soon as possible.`;
};

const sendWhatsappMessage = async (phone: string, message: string) => {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    return {
      sent: false,
      reason: "WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN is not configured",
    };
  }

  const response = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: {
          preview_url: false,
          body: message,
        },
      }),
    },
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      sent: false,
      reason: "WhatsApp API request failed",
      response: data,
    };
  }

  return {
    sent: true,
    response: data,
  };
};

const toPositiveNumber = (value: unknown, field: string) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new AppError(`${field} must be a positive number`, 400);
  }

  return parsed;
};

const toOptionalPositiveInteger = (value: unknown, field: string) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${field} must be a positive integer`, 400);
  }

  return parsed;
};

const buildFeePayload = (
  body: Record<string, unknown>,
  studentId: number,
) => ({
  studentId,
  title: String(body.title ?? "").trim(),
  amount: toPositiveNumber(body.amount, "amount"),
  dueDate: body.dueDate ?? null,
  status: body.status ?? "pending",
});

export const createFee = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const title = String(body.title ?? "").trim();
    const studentId = toOptionalPositiveInteger(body.studentId, "studentId");
    const classId = toOptionalPositiveInteger(body.classId, "classId");

    if (!title) {
      return res.status(400).json({ message: "title is required" });
    }

    if (studentId) {
      const student: any = await Student.findByPk(studentId, {
        include: [
          {
            model: User,
            required: true,
            attributes: userSafeAttributes,
          },
        ],
      });

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      ensureSchoolOwnerCanAccessStudent(req, student.User);

      const fee = await Fee.create(buildFeePayload(body, studentId));

      return res.status(201).json({
        message: "fee created successfully",
        fee,
      });
    }

    if (!classId) {
      return res.status(400).json({
        message: "studentId or classId is required",
      });
    }

    const selectedClass = await Class.findByPk(classId);

    if (!selectedClass) {
      return res.status(404).json({ message: "Class not found" });
    }

    const actor = getActor(req);

    if (actor.role === "school_owner" && !actor.schoolId) {
      return res
        .status(400)
        .json({ message: "school_owner is not attached to any school" });
    }

    const students: any[] = await Student.findAll({
      where: { classId },
      include: [
        {
          model: User,
          required: true,
          attributes: userSafeAttributes,
          where:
            actor.role === "school_owner"
              ? {
                  schoolId: actor.schoolId,
                }
              : undefined,
        },
      ],
    });

    if (students.length === 0) {
      return res.status(404).json({
        message: "No students found for this class",
      });
    }

    const fees = await sequelize.transaction((transaction) =>
      Fee.bulkCreate(
        students.map((student) => buildFeePayload(body, Number(student.id))),
        { transaction, validate: true },
      ),
    );

    return res.status(201).json({
      message: "fees created successfully for class students",
      classId,
      generatedCount: fees.length,
      fees,
    });
  } catch (err) {
    next(err);
  }
};

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

export const getFeeTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const actor = getActor(req);

    if (actor.role === "school_owner" && !actor.schoolId) {
      return res
        .status(400)
        .json({ message: "school_owner is not attached to any school" });
    }

    const { page, limit, offset } = getPagination(req);
    const { rows: transactions, count } = await FeePayment.findAndCountAll({
      include: [
        {
          model: Fee,
        },
        {
          model: Student,
          required: true,
          include: [
            {
              model: User,
              required: true,
              attributes: userSafeAttributes,
              where:
                actor.role === "school_owner"
                  ? {
                      schoolId: actor.schoolId,
                    }
                  : undefined,
            },
            {
              model: Class,
              attributes: ["id", "name"],
            },
            {
              model: Section,
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      order: [["id", "DESC"]],
      distinct: true,
      limit,
      offset,
    });

    res.json({
      transactions,
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

export const markOfflineFeePayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const fee: any = await getFeeWithStudentDetails(String(req.params.id));

    if (!fee) {
      return res.status(404).json({ message: "Fee not found" });
    }

    ensureSchoolOwnerCanAccessStudent(req, fee.Student?.User);

    const amount =
      req.body?.amount !== undefined
        ? Number(req.body.amount)
        : Number(fee.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "amount must be a positive number" });
    }

    const payment = await sequelize.transaction(async (transaction) => {
      const createdPayment = await FeePayment.create(
        {
          feeId: fee.id,
          studentId: fee.studentId,
          amount,
          method: req.body?.method ?? "offline",
          transactionId: req.body?.transactionId ?? null,
          status: "success",
        },
        { transaction },
      );

      await fee.update({ status: "paid" }, { transaction });

      return createdPayment;
    });

    const updatedFee = await getFeeWithStudentDetails(fee.id);

    res.status(201).json({
      message: "Offline payment marked as paid successfully",
      payment,
      fee: updatedFee,
    });
  } catch (err) {
    next(err);
  }
};

export const sendFeeWhatsappReminders = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const actor = getActor(req);

    if (actor.role === "school_owner" && !actor.schoolId) {
      return res
        .status(400)
        .json({ message: "school_owner is not attached to any school" });
    }

    const studentId = req.body?.studentId;
    const feeId = req.body?.feeId;
    const customMessage =
      req.body?.message !== undefined ? String(req.body.message).trim() : "";
    const where: Record<string, unknown> = {
      status: { [Op.in]: defaulterStatuses },
    };

    if (feeId !== undefined && feeId !== null && feeId !== "") {
      where.id = feeId;
    }

    if (studentId !== undefined && studentId !== null && studentId !== "") {
      where.studentId = studentId;
    }

    const fees: any[] = await Fee.findAll({
      where,
      include: [
        {
          model: Student,
          required: true,
          include: [
            {
              model: User,
              required: true,
              attributes: userSafeAttributes,
              where:
                actor.role === "school_owner"
                  ? {
                      schoolId: actor.schoolId,
                    }
                  : undefined,
            },
            {
              model: Class,
              attributes: ["id", "name"],
            },
            {
              model: Section,
              attributes: ["id", "name"],
            },
            {
              model: Parent,
              through: { attributes: [] },
              include: [
                {
                  model: User,
                  attributes: userSafeAttributes,
                },
              ],
            },
          ],
        },
      ],
      order: [["id", "DESC"]],
    });

    const reminders: Array<Record<string, unknown>> = [];

    for (const fee of fees) {
      const parents = Array.isArray(fee.Student?.Parents)
        ? fee.Student.Parents
        : [];

      for (const parent of parents) {
        const phone = normalizePhoneForWhatsapp(parent.phone);

        if (!phone) {
          reminders.push({
            feeId: fee.id,
            studentId: fee.studentId,
            parentId: parent.id,
            sent: false,
            reason: "Parent phone number is missing or invalid",
          });
          continue;
        }

        const message = customMessage || buildDefaultFeeReminderMessage(fee);
        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(
          message,
        )}`;
        const sendResult = await sendWhatsappMessage(phone, message);

        reminders.push({
          feeId: fee.id,
          studentId: fee.studentId,
          studentName: fee.Student?.User?.name ?? null,
          parentId: parent.id,
          parentName: parent.User?.name ?? null,
          phone,
          message,
          whatsappUrl,
          ...sendResult,
        });
      }
    }

    res.json({
      message: "Fee reminders processed",
      mode:
        process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN
          ? "sent"
          : "link_only",
      totalFees: fees.length,
      totalReminders: reminders.length,
      reminders,
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
    const search = String(req.query.search ?? req.query.keyword ?? "").trim();
    const where: Record<string, unknown> = {
      status: { [Op.in]: defaulterStatuses },
    };

    if (search) {
      const searchLike = `%${search}%`;

      where[Op.or as unknown as string] = [
        { title: { [Op.like]: searchLike } },
        { status: { [Op.like]: searchLike } },
        { dueDate: { [Op.like]: searchLike } },
        { "$Student.rollNumber$": { [Op.like]: searchLike } },
        { "$Student.User.name$": { [Op.like]: searchLike } },
        { "$Student.User.email$": { [Op.like]: searchLike } },
        { "$Student.Class.name$": { [Op.like]: searchLike } },
        { "$Student.Section.name$": { [Op.like]: searchLike } },
      ];
    }

    const { rows: fees, count } = await Fee.findAndCountAll({
      where,
      include: [
        {
          model: Student,
          include: [
            {
              model: User,
              attributes: userSafeAttributes,
            },
            {
              model: Class,
              attributes: ["id", "name"],
            },
            {
              model: Section,
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      order: [["id", "DESC"]],
      distinct: true,
      subQuery: false,
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
