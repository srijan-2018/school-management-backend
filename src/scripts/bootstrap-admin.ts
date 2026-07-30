import bcrypt from "bcryptjs";
import User from "../models/user.model";

export const bootstrapAdmin = async () => {
  const existingAdmin = await User.findOne({
    where: { role: "admin" },
    attributes: ["id"],
  });

  if (existingAdmin) {
    console.log("Admin bootstrap skipped: an admin already exists");
    return;
  }

  const name = process.env.ADMIN_NAME?.trim() || "Super Admin";
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD are required when no admin account exists",
    );
  }

  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters");
  }

  const existingUser = await User.findOne({
    where: { email },
    attributes: ["id", "role"],
  });

  if (existingUser) {
    throw new Error(
      `Cannot bootstrap admin: ${email} already belongs to a non-admin user`,
    );
  }

  await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 10),
    role: "admin",
    schoolId: null,
  });

  console.log(`Admin bootstrap completed for ${email}`);
};
