import { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/user.model";
import { normalizeRole, USER_ROLES } from "../utils/roles";

const userSafeAttributes = {
  exclude: ["password", "resetPasswordToken", "resetPasswordExpires"],
};

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const users = await User.findAll({
      attributes: userSafeAttributes,
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

    const normalizedEmail = String(email).trim().toLowerCase();
    const exist = await User.findOne({ where: { email: normalizedEmail } });

    if (exist) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      role: normalizedRole,
    });

    const createdUser = await User.findByPk(user.get("id") as number, {
      attributes: userSafeAttributes,
    });

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

    if (email) {
      user.email = String(email).trim().toLowerCase();
    }

    if (name) {
      user.name = String(name).trim();
    }

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    if (role) {
      const normalizedRole = normalizeRole(role);

      if (!normalizedRole) {
        return res.status(400).json({
          message: `Invalid role. Allowed roles: ${USER_ROLES.join(", ")}`,
        });
      }

      user.role = normalizedRole;
    }

    await user.save();

    const updatedUser = await User.findByPk(user.id, {
      attributes: userSafeAttributes,
    });

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
