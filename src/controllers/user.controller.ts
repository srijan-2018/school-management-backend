import { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { Transaction } from "sequelize";
import { sequelize } from "../config/db";
import User from "../models/user.model";
import Student from "../models/student.model";
import Class from "../models/class.model";
import Section from "../models/section.model";
import { AppError } from "../middlewares/error.middleware";
import { normalizeRole, USER_ROLES } from "../utils/roles";

const userSafeAttributes = {
  exclude: ["password", "resetPasswordToken", "resetPasswordExpires"],
};

const userInclude = [
  {
    model: Student,
    as: "student",
  },
];

const hasStudentPayload = (body: Record<string, unknown>) =>
  body.classId !== undefined ||
  body.sectionId !== undefined ||
  body.rollNumber !== undefined;

const toOptionalInteger = (value: unknown, field: string) => {
  if (value === undefined || value === null || value === "") return undefined;

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${field} must be a positive integer`, 400);
  }

  return parsed;
};

const getSectionIdFromName = (sectionName: unknown) => {
  const normalizedSection = String(sectionName ?? "").trim().toUpperCase();

  if (/^[A-Z]$/.test(normalizedSection)) {
    return normalizedSection.charCodeAt(0) - 64;
  }

  return undefined;
};

const findUserWithProfile = (id: number | string) =>
  User.findByPk(id, {
    attributes: userSafeAttributes,
    include: userInclude,
  });

const upsertStudentProfile = async (
  userId: number,
  body: Record<string, unknown>,
  transaction: Transaction,
) => {
  const requestedClassId = toOptionalInteger(body.classId, "classId");
  const requestedSectionId = toOptionalInteger(body.sectionId, "sectionId");
  const existingStudent: any = await Student.findOne({
    where: { userId },
    transaction,
  });
  let classId = requestedClassId ?? existingStudent?.classId;
  let sectionId = requestedSectionId ?? existingStudent?.sectionId ?? null;

  if (!classId && requestedSectionId) {
    const section: any = await Section.findByPk(requestedSectionId, {
      transaction,
    });

    if (!section) {
      throw new AppError("Section not found", 400);
    }

    classId = section.classId;
  }

  if (!classId) {
    throw new AppError("classId is required to add class section", 400);
  }

  const selectedClass: any = await Class.findByPk(classId, { transaction });

  if (!selectedClass) {
    throw new AppError("Class not found", 400);
  }

  if (requestedSectionId) {
    let section: any = await Section.findByPk(requestedSectionId, {
      transaction,
    });

    if (!section || Number(section.classId) !== Number(classId)) {
      const classSectionName = selectedClass.section;
      const fallbackSectionId = getSectionIdFromName(classSectionName);

      if (fallbackSectionId !== requestedSectionId || !classSectionName) {
        throw new AppError(
          section ? "sectionId does not belong to classId" : "Section not found",
          400,
        );
      }

      const [classSection] = await Section.findOrCreate({
        where: {
          classId,
          name: String(classSectionName).trim(),
        },
        defaults: {
          classId,
          name: String(classSectionName).trim(),
        },
        transaction,
      });

      section = classSection;
    }

    sectionId = section.id;
  }

  const profile = {
    userId,
    classId,
    sectionId,
    rollNumber:
      body.rollNumber !== undefined
        ? String(body.rollNumber).trim()
        : existingStudent?.rollNumber,
  };

  if (existingStudent) {
    await existingStudent.update(profile, { transaction });
    return existingStudent;
  }

  return Student.create(profile, { transaction });
};

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const users = await User.findAll({
      attributes: userSafeAttributes,
      include: userInclude,
      order: [["id", "DESC"]],
    });

    res.json({ users });
  } catch (err) {
    next(err);
  }
};

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, email, password, role } = req.body ?? {};

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "name, email, password and role are required",
      });
    }

    const normalizedRole = normalizeRole(role);

    if (!normalizedRole) {
      return res.status(400).json({
        message: `Invalid role. Allowed roles: ${USER_ROLES.join(", ")}`,
      });
    }

    if (hasStudentPayload(req.body ?? {}) && normalizedRole !== "student") {
      return res.status(400).json({
        message: "classId, sectionId and rollNumber can only be added for student users",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const exist = await User.findOne({ where: { email: normalizedEmail } });

    if (exist) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await sequelize.transaction(async (transaction) => {
      const createdUser = await User.create(
        {
          name: String(name).trim(),
          email: normalizedEmail,
          password: await bcrypt.hash(password, 10),
          role: normalizedRole,
        },
        { transaction },
      );

      if (hasStudentPayload(req.body ?? {})) {
        await upsertStudentProfile(
          createdUser.get("id") as number,
          req.body ?? {},
          transaction,
        );
      }

      return createdUser;
    });

    const createdUser = await findUserWithProfile(user.get("id") as number);

    res.status(201).json({
      message: "User created successfully",
      user: createdUser,
    });
  } catch (err) {
    next(err);
  }
};

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await User.findByPk(String(req.params.id), {
      attributes: userSafeAttributes,
      include: userInclude,
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, email, password, role } = req.body ?? {};
    const user: any = await User.findByPk(String(req.params.id));

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let nextRole = user.role;
    if (role) {
      const normalizedRole = normalizeRole(role);

      if (!normalizedRole) {
        return res.status(400).json({
          message: `Invalid role. Allowed roles: ${USER_ROLES.join(", ")}`,
        });
      }

      nextRole = normalizedRole;
    }

    if (hasStudentPayload(req.body ?? {}) && nextRole !== "student") {
      return res.status(400).json({
        message: "classId, sectionId and rollNumber can only be added for student users",
      });
    }

    await sequelize.transaction(async (transaction) => {
      if (email) {
        user.email = String(email).trim().toLowerCase();
      }

      if (name) {
        user.name = String(name).trim();
      }

      if (password) {
        user.password = await bcrypt.hash(password, 10);
      }

      user.role = nextRole;

      await user.save({ transaction });

      if (hasStudentPayload(req.body ?? {})) {
        await upsertStudentProfile(user.id, req.body ?? {}, transaction);
      }
    });

    const updatedUser = await findUserWithProfile(user.id);

    res.json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await User.findByPk(String(req.params.id));

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.destroy();

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    next(err);
  }
};
