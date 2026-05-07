export const USER_ROLES = [
  "admin",
  "school_owner",
  "head_teacher",
  "teacher",
  "staff",
  "student",
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
};

export const normalizeRole = (value: unknown): UserRole | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");

  if (normalizedValue in ROLE_ALIASES) {
    return ROLE_ALIASES[normalizedValue];
  }

  return ROLE_ALIASES[value.trim().toLowerCase()] ?? null;
};

export const isUserRole = (value: unknown): value is UserRole => {
  return normalizeRole(value) !== null;
};
