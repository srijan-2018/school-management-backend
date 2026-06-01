import { NextFunction, Request, Response } from "express";
import User from "../models/user.model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { normalizeRole, USER_ROLES } from "../utils/roles";
import { findUserWithProfile } from "./user.controller";

const getJwtSecret = () => process.env.JWT_SECRET;

const getRefreshTokenSecret = () =>
  process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

const revokedRefreshTokens = new Set<string>();

const generateTokens = (user: {
  id: number;
  role: string;
  schoolId?: number | null;
}) => {
  const jwtSecret = getJwtSecret();
  const refreshTokenSecret = getRefreshTokenSecret();

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  if (!refreshTokenSecret) {
    throw new Error("JWT_REFRESH_SECRET is not configured");
  }

  const payload = { id: user.id, role: user.role, schoolId: user.schoolId ?? null };

  const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: "30m" });
  const refreshToken = jwt.sign(payload, refreshTokenSecret, {
    expiresIn: "30d",
  });

  return { accessToken, refreshToken };
};

// REGISTER
export const register = async (
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

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedRole = normalizeRole(role);

    if (!normalizedRole) {
      return res.status(400).json({
        message: `Invalid role. Allowed roles: ${USER_ROLES.join(", ")}`,
      });
    }

    if (normalizedRole === "school_owner") {
      return res.status(403).json({
        message: "school_owner can only be created by admin",
      });
    }

    const exist = await User.findOne({ where: { email: normalizedEmail } });
    if (exist) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole,
    });

    const { accessToken, refreshToken } = generateTokens({
      id: user.get("id") as number,
      role: user.get("role") as string,
      schoolId: (user.get("schoolId") as number | null | undefined) ?? null,
    });

    res.status(201).json({
      message: "User registered",
      token: accessToken,
      accessToken,
      refreshToken,
      user: {
        id: user.get("id"),
        name: user.get("name"),
        email: user.get("email"),
        role: user.get("role"),
        schoolId: user.get("schoolId") ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
};

// LOGIN
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({
        message: "email and password are required",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const user: any = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Wrong password" });

    const { accessToken, refreshToken } = generateTokens(user);

    res.json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { refreshToken } = req.body ?? {};

    if (!refreshToken) {
      return res.status(400).json({ message: "refreshToken is required" });
    }

    if (revokedRefreshTokens.has(refreshToken)) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const refreshTokenSecret = getRefreshTokenSecret();

    if (!refreshTokenSecret) {
      return res.status(500).json({
        message: "JWT_REFRESH_SECRET is not configured",
      });
    }

    const decoded = jwt.verify(refreshToken, refreshTokenSecret);

    if (
      typeof decoded === "string" ||
      typeof decoded.id !== "number" ||
      typeof decoded.role !== "string"
    ) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user: any = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const tokens = generateTokens(user);

    res.json({
      message: "Token refreshed",
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { refreshToken } = req.body ?? {};

    if (!refreshToken) {
      return res.status(400).json({ message: "refreshToken is required" });
    }

    revokedRefreshTokens.add(refreshToken);

    res.json({
      message: "Logout successful",
    });
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { currentPassword, newPassword } = req.body ?? {};
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "currentPassword and newPassword are required",
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({
        message: "newPassword must be at least 6 characters",
      });
    }

    const user: any = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Current password is wrong" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({
      message: "Password changed successfully",
    });
  } catch (err) {
    next(err);
  }
};

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await findUserWithProfile(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email } = req.body ?? {};

    if (!email) {
      return res.status(400).json({ message: "email is required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user: any = await User.findOne({ where: { email: normalizedEmail } });

    if (!user) {
      return res.json({
        message: "If the email exists, a password reset token has been created",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const response: Record<string, unknown> = {
      message: "Password reset token created",
      resetToken,
      expiresIn: "15 minutes",
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { resetToken, newPassword } = req.body ?? {};

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        message: "resetToken and newPassword are required",
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({
        message: "newPassword must be at least 6 characters",
      });
    }

    const hashedResetToken = crypto
      .createHash("sha256")
      .update(String(resetToken))
      .digest("hex");

    const user: any = await User.findOne({
      where: {
        resetPasswordToken: hashedResetToken,
      },
    });

    if (
      !user ||
      !user.resetPasswordExpires ||
      new Date(user.resetPasswordExpires).getTime() < Date.now()
    ) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({
      message: "Password reset successfully",
    });
  } catch (err) {
    next(err);
  }
};
