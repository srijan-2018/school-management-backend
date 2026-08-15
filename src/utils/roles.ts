export const USER_ROLES = [
  "admin",
  "school_owner",
  "administrator",
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
  super_admin: "admin",
  "super admin": "admin",
  school_owner: "school_owner",
  "school owner": "school_owner",
  schoolowner: "school_owner",
  owner: "school_owner",
  administrator: "administrator",
  "school administrator": "administrator",
  school_administrator: "administrator",
  schooladministrator: "administrator",
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

/** Platform super admin (stored as admin). */
export const isPlatformAdmin = (role: unknown): boolean =>
  normalizeRole(role) === "admin";

export const OWNER_LEVEL_ROLES: UserRole[] = [
  "admin",
  "school_owner",
  "administrator",
];

export const USER_MANAGER_ROLES: UserRole[] = [...OWNER_LEVEL_ROLES];

export const SCHOOL_CREATION_ROLES: UserRole[] = ["admin"];

export const SCHOOL_OWNER_MANAGED_ROLES: UserRole[] = [
  "head_teacher",
  "teacher",
  "student",
  "staff",
  "accountant",
  "driver",
  "parent",
  "administrator",
];

export const PUBLIC_REGISTER_ROLES: UserRole[] = ["student", "parent"];

export const ACADEMIC_MANAGER_ROLES: UserRole[] = [
  ...OWNER_LEVEL_ROLES,
  "head_teacher",
];

export const MOCK_TEST_MANAGER_ROLES: UserRole[] = [
  ...ACADEMIC_MANAGER_ROLES,
  "teacher",
];

export const ASSIGNMENT_MANAGER_ROLES: UserRole[] = [
  ...MOCK_TEST_MANAGER_ROLES,
];

export const MOCK_TEST_GENERATOR_ROLES: UserRole[] = [
  ...MOCK_TEST_MANAGER_ROLES,
  "student",
];

export const CHAPTER_MANAGE_ROLES: UserRole[] = [
  "admin",
  "administrator",
  "school_owner",
  "head_teacher",
  "teacher",
];

export const STAFF_ATTENDANCE_ROLES: UserRole[] = [
  "admin",
  "school_owner",
  "administrator",
  "head_teacher",
  "teacher",
  "staff",
  "driver",
  "accountant",
];

export const ATTENDANCE_RULE_MANAGER_ROLES: UserRole[] = [
  "admin",
  "school_owner",
];

export const INVENTORY_ROLES: UserRole[] = [
  "admin",
  "school_owner",
  "administrator",
  "head_teacher",
  "teacher",
  "staff",
  "accountant",
];

export const ELEARNING_MANAGER_ROLES: UserRole[] = [
  "admin",
  "school_owner",
  "administrator",
  "head_teacher",
  "teacher",
  "staff",
];

export const ELEARNING_VIEW_ROLES: UserRole[] = [
  ...ELEARNING_MANAGER_ROLES,
  "student",
];

export const PLAYGROUND_MANAGER_ROLES: UserRole[] = [
  "admin",
  "school_owner",
  "administrator",
  "head_teacher",
  "teacher",
];

export const PLAYGROUND_VIEW_ROLES: UserRole[] = [
  ...PLAYGROUND_MANAGER_ROLES,
  "student",
];

export const EXAM_MANAGER_ROLES: UserRole[] = [
  "admin",
  "school_owner",
  "administrator",
  "head_teacher",
  "teacher",
  "staff",
];

export const EXAM_VIEW_ROLES: UserRole[] = [
  ...EXAM_MANAGER_ROLES,
  "student",
  "parent",
];

export const FINANCE_MANAGER_ROLES: UserRole[] = [
  "admin",
  "school_owner",
  "administrator",
  "accountant",
];

export const HR_MANAGER_ROLES: UserRole[] = [
  "admin",
  "school_owner",
  "administrator",
];

/** Employees who can request leave (not student/parent). */
export const EMPLOYEE_LEAVE_ROLES: UserRole[] = [
  "teacher",
  "staff",
  "head_teacher",
  "accountant",
  "driver",
  "administrator",
];

/** Anyone who can list/create leave: managers + employees. */
export const LEAVE_ACCESS_ROLES: UserRole[] = [
  ...HR_MANAGER_ROLES,
  ...EMPLOYEE_LEAVE_ROLES.filter((role) => !HR_MANAGER_ROLES.includes(role)),
];

/** School members who can view the holiday/event calendar. */
export const CALENDAR_VIEW_ROLES: UserRole[] = [...USER_ROLES];

/** Roles that receive exam / event / notice notifications. */
export const NOTIFICATION_AUDIENCE_ROLES: UserRole[] = [
  "teacher",
  "head_teacher",
  "school_owner",
  "admin",
  "administrator",
  "student",
  "parent",
];

/** Roles that can view the notifications inbox. */
export const NOTIFICATION_VIEW_ROLES: UserRole[] = [
  ...NOTIFICATION_AUDIENCE_ROLES,
];

/** Roles that can publish free-form school notices. */
export const NOTICE_PUBLISH_ROLES: UserRole[] = [
  "admin",
  "school_owner",
  "administrator",
];

export const TRANSPORT_MANAGER_ROLES: UserRole[] = [
  "admin",
  "school_owner",
  "administrator",
  "driver",
];

/** Roles that can view live trips / boarding status. */
export const TRANSPORT_VIEW_ROLES: UserRole[] = [
  ...TRANSPORT_MANAGER_ROLES,
  "head_teacher",
  "teacher",
  "staff",
  "parent",
];

/** Roles that can operate a trip (board / drop / GPS). */
export const TRANSPORT_DRIVER_OPS_ROLES: UserRole[] = [
  "admin",
  "school_owner",
  "administrator",
  "driver",
];

export const HOSTEL_MANAGER_ROLES: UserRole[] = [
  "admin",
  "school_owner",
  "administrator",
  "staff",
];

export const ANALYTICS_VIEW_ROLES: UserRole[] = [
  "admin",
  "school_owner",
  "administrator",
  "head_teacher",
  "accountant",
];
