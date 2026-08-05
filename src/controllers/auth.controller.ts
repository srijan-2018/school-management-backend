import { NextFunction, Request, Response } from "express";
import User from "../models/user.model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  normalizeRole,
  PUBLIC_REGISTER_ROLES,
  USER_ROLES,
} from "../utils/roles";
import { findUserWithProfile } from "./user.controller";
import {
  getAvatarGender,
  isValidAvatarId,
  normalizeProfileGender,
} from "../constants/profile-avatars";
import { AppError } from "../middlewares/error.middleware";

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

  const payload = {
    id: user.id,
    role: user.role,
    schoolId: user.schoolId ?? null,
  };

  const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: "30m" });
  const refreshToken = jwt.sign(payload, refreshTokenSecret, {
    expiresIn: "30d",
  });

  return { accessToken, refreshToken };
};

/** Public registration is limited to non-privileged roles. Admin/owner accounts must be created via /api/users. */
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

    if (!PUBLIC_REGISTER_ROLES.includes(normalizedRole)) {
      return res.status(403).json({
        message:
          "Public registration is limited to student and parent. Contact an administrator.",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        message: "password must be at least 6 characters",
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
      schoolId: null,
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

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const loginUser = {
      id: user.get("id") as number,
      name: user.get("name"),
      email: user.get("email"),
      role: user.get("role") as string,
      schoolId: (user.get("schoolId") as number | null | undefined) ?? null,
      gender:
        (user.get("gender") as "male" | "female" | null | undefined) ?? null,
      avatarId: (user.get("avatarId") as string | null | undefined) ?? null,
    };

    const { accessToken, refreshToken } = generateTokens(loginUser);

    res.json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: loginUser,
    });
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  try {
    const { refreshToken: token } = req.body ?? {};

    if (!token) {
      return res.status(400).json({ message: "refreshToken is required" });
    }

    if (revokedRefreshTokens.has(token)) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const refreshTokenSecret = getRefreshTokenSecret();

    if (!refreshTokenSecret) {
      return res.status(500).json({
        message: "JWT_REFRESH_SECRET is not configured",
      });
    }

    const decoded = jwt.verify(token, refreshTokenSecret);

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

    revokedRefreshTokens.add(token);

    const tokens = generateTokens({
      id: user.get("id") as number,
      role: user.get("role") as string,
      schoolId: (user.get("schoolId") as number | null | undefined) ?? null,
    });

    res.json({
      message: "Token refreshed",
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { refreshToken: token } = req.body ?? {};

    if (!token) {
      return res.status(400).json({ message: "refreshToken is required" });
    }

    revokedRefreshTokens.add(token);

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
    const userId = req.user?.id;

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
    const userId = req.user?.id;

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

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user: any = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const payload: {
      gender?: "male" | "female" | null;
      avatarId?: string | null;
    } = {};

    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "gender")) {
      if (req.body.gender === null || req.body.gender === "") {
        payload.gender = null;
      } else {
        const gender = normalizeProfileGender(req.body.gender);
        if (!gender) {
          throw new AppError("gender must be male or female", 400);
        }
        payload.gender = gender;
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "avatarId")) {
      if (req.body.avatarId === null || req.body.avatarId === "") {
        payload.avatarId = null;
      } else {
        const avatarId = String(req.body.avatarId).trim();
        const nextGender =
          payload.gender !== undefined
            ? payload.gender
            : normalizeProfileGender(user.gender);

        if (!isValidAvatarId(avatarId, nextGender)) {
          throw new AppError(
            nextGender
              ? `avatarId is not valid for ${nextGender} profiles`
              : "avatarId is not valid. Choose a gender first.",
            400,
          );
        }

        payload.avatarId = avatarId;
        if (!nextGender) {
          payload.gender = getAvatarGender(avatarId);
        }
      }
    }

    if (payload.gender && user.avatarId && payload.avatarId === undefined) {
      if (!isValidAvatarId(user.avatarId, payload.gender)) {
        payload.avatarId = null;
      }
    }

    if (Object.keys(payload).length === 0) {
      throw new AppError("Provide gender and/or avatarId to update", 400);
    }

    await user.update(payload);

    const refreshed = await findUserWithProfile(userId);
    res.json({
      message: "Profile updated",
      user: refreshed,
    });
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

    const genericMessage =
      "If the email exists, a password reset link has been sent";

    if (!user) {
      return res.json({ message: genericMessage });
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
      message: genericMessage,
    };

    if (
      process.env.NODE_ENV !== "production" &&
      process.env.EXPOSE_RESET_TOKEN === "true"
    ) {
      response.resetToken = resetToken;
      response.expiresIn = "15 minutes";
    }

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
