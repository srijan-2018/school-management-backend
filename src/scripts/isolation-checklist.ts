/**
 * Lightweight isolation checklist for school-scoped APIs.
 * Run manually against a live server with two schools and tokens.
 *
 * Expected:
 * - school_owner A cannot read school B records
 * - admin without X-School-Id gets 400 on requireSchool routes
 * - admin with X-School-Id only sees that school
 */

export const isolationChecklist = [
  "POST /auth/login as school_owner A",
  "GET /students without spoofing another schoolId",
  "GET /classes returns only school A",
  "POST /lifecycle/admissions stamps school A",
  "Login as admin, omit X-School-Id, call /dashboard/overview => 400",
  "Login as admin, set X-School-Id:B, call /students => school B only",
  "school_owner A sending X-School-Id:B => 403",
];
