export type SchoolFeatureKey =
  | "students"
  | "teachers"
  | "parents"
  | "classes"
  | "sections"
  | "subjects"
  | "chapters"
  | "attendance"
  | "examinations"
  | "mock-tests"
  | "assignments"
  | "leave"
  | "calendar"
  | "timetable"
  | "fees"
  | "inventory"
  | "elearning"
  | "playground"
  | "lifecycle"
  | "transport"
  | "hostel"
  | "hr"
  | "analytics"
  | "notifications";

export type SchoolFeatureDefinition = {
  key: SchoolFeatureKey;
  label: string;
  description: string;
  group: "Academic" | "Operations" | "Extended";
};

/** Canonical school-module feature catalog (default ON for new schools). */
export const SCHOOL_FEATURE_CATALOG: SchoolFeatureDefinition[] = [
  {
    key: "students",
    label: "Students",
    description: "Student roster and profiles",
    group: "Academic",
  },
  {
    key: "teachers",
    label: "Teachers",
    description: "Teaching staff records",
    group: "Academic",
  },
  {
    key: "parents",
    label: "Parents",
    description: "Parent profiles and links",
    group: "Academic",
  },
  {
    key: "classes",
    label: "Classes",
    description: "Class structure setup",
    group: "Academic",
  },
  {
    key: "sections",
    label: "Sections",
    description: "Class sections",
    group: "Academic",
  },
  {
    key: "subjects",
    label: "Subjects",
    description: "Subject catalog",
    group: "Academic",
  },
  {
    key: "chapters",
    label: "Chapters",
    description: "Subject chapters",
    group: "Academic",
  },
  {
    key: "attendance",
    label: "Attendance",
    description: "Student and staff attendance",
    group: "Operations",
  },
  {
    key: "examinations",
    label: "Examinations",
    description: "Exams, schedules, and marks",
    group: "Operations",
  },
  {
    key: "mock-tests",
    label: "Mock Tests",
    description: "AI mock tests",
    group: "Operations",
  },
  {
    key: "assignments",
    label: "Assignments",
    description: "Homework and submissions",
    group: "Operations",
  },
  {
    key: "leave",
    label: "Leave",
    description: "Leave requests",
    group: "Operations",
  },
  {
    key: "calendar",
    label: "Calendar",
    description: "School holidays and events",
    group: "Operations",
  },
  {
    key: "timetable",
    label: "Timetable",
    description: "Class timetables",
    group: "Operations",
  },
  {
    key: "fees",
    label: "Fees",
    description: "Fee plans and collections",
    group: "Operations",
  },
  {
    key: "inventory",
    label: "Inventory",
    description: "Assets and stock",
    group: "Extended",
  },
  {
    key: "elearning",
    label: "E-Learning",
    description: "LMS content and playlists",
    group: "Extended",
  },
  {
    key: "playground",
    label: "Playground",
    description: "Learning playground",
    group: "Extended",
  },
  {
    key: "lifecycle",
    label: "Student Lifecycle",
    description: "Admissions and lifecycle",
    group: "Extended",
  },
  {
    key: "transport",
    label: "Transport",
    description: "Routes and vehicles",
    group: "Extended",
  },
  {
    key: "hostel",
    label: "Hostel",
    description: "Hostel allocations",
    group: "Extended",
  },
  {
    key: "hr",
    label: "HR & Payroll",
    description: "Staff HR and payroll",
    group: "Extended",
  },
  {
    key: "analytics",
    label: "Analytics",
    description: "School analytics",
    group: "Extended",
  },
  {
    key: "notifications",
    label: "Notifications",
    description: "Exam, event, and notice alerts",
    group: "Operations",
  },
];

export const SCHOOL_FEATURE_KEYS = SCHOOL_FEATURE_CATALOG.map(
  (feature) => feature.key,
);

export const isSchoolFeatureKey = (value: unknown): value is SchoolFeatureKey =>
  typeof value === "string" &&
  (SCHOOL_FEATURE_KEYS as string[]).includes(value);

/** Map first URL path segment under /api to a feature key. */
export const SCHOOL_FEATURE_BY_ROUTE_PREFIX: Record<string, SchoolFeatureKey> = {
  students: "students",
  teachers: "teachers",
  parents: "parents",
  classes: "classes",
  sections: "sections",
  subjects: "subjects",
  chapters: "chapters",
  attendance: "attendance",
  "staff-attendance": "attendance",
  exams: "examinations",
  "exam-schedules": "examinations",
  marks: "examinations",
  "mock-tests": "mock-tests",
  assignments: "assignments",
  leave: "leave",
  "leave-requests": "leave",
  calendar: "calendar",
  "school-calendar": "calendar",
  timetable: "timetable",
  fees: "fees",
  inventory: "inventory",
  elearning: "elearning",
  playground: "playground",
  lifecycle: "lifecycle",
  admissions: "lifecycle",
  transport: "transport",
  hostel: "hostel",
  hr: "hr",
  payroll: "hr",
  analytics: "analytics",
  notifications: "notifications",
};
