export const LEAVE_TYPES = [
  "Casual Leave",
  "Sick Leave",
  "Privilege Leave",
] as const;

export type LeaveType = (typeof LEAVE_TYPES)[number];

const LEAVE_TYPE_ALIASES: Record<string, LeaveType> = {
  casual: "Casual Leave",
  "casual leave": "Casual Leave",
  sick: "Sick Leave",
  "sick leave": "Sick Leave",
  privilege: "Privilege Leave",
  "privilege leave": "Privilege Leave",
  previlage: "Privilege Leave",
  "previlage leave": "Privilege Leave",
  privileged: "Privilege Leave",
  "privileged leave": "Privilege Leave",
};

export function normalizeLeaveType(value: unknown): LeaveType | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const trimmed = value.trim();
  const exact = LEAVE_TYPES.find(
    (type) => type.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exact) {
    return exact;
  }

  return LEAVE_TYPE_ALIASES[trimmed.toLowerCase()] ?? null;
}
