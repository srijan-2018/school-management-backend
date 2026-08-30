import crypto from "crypto";
import bcrypt from "bcryptjs";

import { AppError } from "../middlewares/error.middleware";
import School from "../models/school.model";
import User from "../models/user.model";
import { normalizeRole } from "../utils/roles";

function generateOwnerPassword() {
  return `Ow${crypto.randomBytes(6).toString("base64url")}9`;
}

function readPassword(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "";
  }

  const source = body as Record<string, unknown>;
  const value = source.ownerPassword ?? source.password;
  return typeof value === "string" ? value.trim() : "";
}

export async function ensureSchoolOwnerAccount(
  school: School,
  body?: unknown,
) {
  const email = String(school.get("email") ?? "")
    .trim()
    .toLowerCase();
  const schoolId = Number(school.id);
  const schoolName = String(school.get("name") ?? "School").trim() || "School";

  if (!email) {
    throw new AppError("School email is required to create the owner login", 400);
  }

  if (!Number.isInteger(schoolId) || schoolId <= 0) {
    throw new AppError("Invalid school id", 400);
  }

  const requestedPassword = readPassword(body);
  let temporaryPassword: string | undefined;
  let password = requestedPassword;

  if (password.length > 0 && password.length < 6) {
    throw new AppError("Owner password must be at least 6 characters", 400);
  }

  if (!password) {
    temporaryPassword = generateOwnerPassword();
    password = temporaryPassword;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const existing = await User.findOne({ where: { email } });

  if (existing) {
    const role = normalizeRole(existing.get("role"));
    const existingSchoolId = Number(existing.get("schoolId"));

    if (role === "admin") {
      throw new AppError(
        "This email belongs to a Super Admin account and cannot be a school owner",
        409,
      );
    }

    if (role !== "school_owner") {
      throw new AppError("This email is already used by another user", 409);
    }

    if (
      Number.isInteger(existingSchoolId) &&
      existingSchoolId > 0 &&
      existingSchoolId !== schoolId
    ) {
      throw new AppError(
        "This email is already a school owner for another school",
        409,
      );
    }

    await existing.update({
      password: hashedPassword,
      schoolId,
      name: String(existing.get("name") ?? "").trim() || `${schoolName} Owner`,
    });

    return { user: existing, temporaryPassword };
  }

  const user = await User.create({
    name: `${schoolName} Owner`,
    email,
    password: hashedPassword,
    role: "school_owner",
    schoolId,
  });

  return { user, temporaryPassword };
}
