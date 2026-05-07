"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUserRole = exports.normalizeRole = exports.USER_ROLES = void 0;
exports.USER_ROLES = [
    "admin",
    "school_owner",
    "head_teacher",
    "teacher",
    "staff",
    "student",
    "parent",
    "accountant",
    "driver",
];
const ROLE_ALIASES = {
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
const normalizeRole = (value) => {
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
exports.normalizeRole = normalizeRole;
const isUserRole = (value) => {
    return (0, exports.normalizeRole)(value) !== null;
};
exports.isUserRole = isUserRole;
