export const USER_ROLES = [
  "admin",
  "school_owner",
  "head_teacher",
  "teacher",
  "staff",
  "student",
  "parent",
  "accountant",
  "driver",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

const ROLE_ALIASES: Record<string, UserRole> = {
  admin: "admin",
  school_owner: "school_owner",
  "school owner": "school_owner",
  schoolowner: "school_owner",
  owner: "school_owner",
  head_teacher: "head_teacher",
  "head teacher": "head_teacher",
  headteacher: "head_teacher",
  teacher: "teacher",
  staff: "staff",
  student: "student",
  parent: "parent",
  accountant: "accountant",
  driver: "driver",
};

export const normalizeRole = (value: unknown): UserRole | null => {
  if (typeof value !== "string") {
    return null;
  }

  return ROLE_ALIASES[value.trim().toLowerCase()] ?? null;
};

export const isUserRole = (value: unknown): value is UserRole => {
  return normalizeRole(value) !== null;
};
