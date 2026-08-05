import { Router } from "express";
import { allowRoles, verifyToken } from "../middlewares/auth.middleware";
import {
  requireSchoolContext,
  resolveSchoolContext,
} from "../middlewares/school-context.middleware";
import { enforceSchoolFeatures } from "../middlewares/school-feature.middleware";
import * as school from "../controllers/school.controller";
import * as schoolFeature from "../controllers/school-feature.controller";
import * as student from "../controllers/student.controller";
import * as teacher from "../controllers/teacher.controller";
import * as parent from "../controllers/parent.controller";
import * as classController from "../controllers/class.controller";
import * as section from "../controllers/section.controller";
import * as subject from "../controllers/subject.controller";
import * as chapter from "../controllers/chapter.controller";
import * as attendance from "../controllers/attendance.controller";
import * as exam from "../controllers/exam.controller";
import * as mark from "../controllers/mark.controller";
import * as mockTest from "../controllers/mock-test.controller";
import * as assignment from "../controllers/assignment.controller";
import * as timetable from "../controllers/timetable.controller";
import * as fee from "../controllers/fee.controller";
import * as inventory from "../controllers/inventory.controller";
import * as elearning from "../controllers/elearning.controller";
import * as playground from "../controllers/playground.controller";
import * as lifecycle from "../controllers/lifecycle.controller";
import * as transport from "../controllers/transport.controller";
import * as hostel from "../controllers/hostel.controller";
import * as hr from "../controllers/hr.controller";
import * as analytics from "../controllers/analytics.controller";
import * as dashboard from "../controllers/dashboard.controller";
import * as notification from "../controllers/notification.controller";
import {
  ACADEMIC_MANAGER_ROLES,
  ANALYTICS_VIEW_ROLES,
  ATTENDANCE_RULE_MANAGER_ROLES,
  CHAPTER_MANAGE_ROLES,
  ELEARNING_MANAGER_ROLES,
  ELEARNING_VIEW_ROLES,
  PLAYGROUND_MANAGER_ROLES,
  PLAYGROUND_VIEW_ROLES,
  EXAM_MANAGER_ROLES,
  EXAM_VIEW_ROLES,
  FINANCE_MANAGER_ROLES,
  HOSTEL_MANAGER_ROLES,
  HR_MANAGER_ROLES,
  LEAVE_ACCESS_ROLES,
  CALENDAR_VIEW_ROLES,
  MOCK_TEST_GENERATOR_ROLES,
  INVENTORY_ROLES,
  MOCK_TEST_MANAGER_ROLES,
  ASSIGNMENT_MANAGER_ROLES,
  NOTICE_PUBLISH_ROLES,
  NOTIFICATION_VIEW_ROLES,
  OWNER_LEVEL_ROLES,
  SCHOOL_CREATION_ROLES,
  STAFF_ATTENDANCE_ROLES,
  TRANSPORT_MANAGER_ROLES,
} from "../utils/roles";

const router = Router();

router.use(verifyToken);
router.use(resolveSchoolContext());
router.use(enforceSchoolFeatures);

const methodNotAllowed = (message: string) => (_req: any, res: any) => {
  res.status(405).json({ message });
};

router.get("/dashboard/overview", requireSchoolContext, dashboard.getOverview);
router.get(
  "/dashboard/platform-overview",
  allowRoles(...SCHOOL_CREATION_ROLES),
  dashboard.getPlatformOverview,
);

router.get(
  "/school-features/catalog",
  allowRoles(...SCHOOL_CREATION_ROLES),
  schoolFeature.getFeatureCatalog,
);
router.get("/school-features/me", schoolFeature.getMySchoolFeatures);

router.get("/schools", school.getSchools);
router.post("/schools", allowRoles(...SCHOOL_CREATION_ROLES), school.createSchool);
router.get("/schools/:id", school.getSchoolById);
router.put(
  "/schools/:id",
  allowRoles(...OWNER_LEVEL_ROLES),
  school.updateSchool,
);
router.delete(
  "/schools/:id",
  allowRoles(...SCHOOL_CREATION_ROLES),
  school.deleteSchool,
);
router.get(
  "/schools/:id/features",
  schoolFeature.getSchoolFeatures,
);
router.put(
  "/schools/:id/features",
  allowRoles(...SCHOOL_CREATION_ROLES),
  schoolFeature.updateSchoolFeatures,
);

router.get("/students", requireSchoolContext, student.getStudents);
router.post(
  "/students",
  allowRoles(...ACADEMIC_MANAGER_ROLES),
  student.createStudent,
);
router.get("/students/:id", student.getStudentById);
router.put(
  "/students/:id",
  allowRoles(...ACADEMIC_MANAGER_ROLES),
  student.updateStudent,
);
router.delete(
  "/students/:id",
  allowRoles(...OWNER_LEVEL_ROLES),
  student.deleteStudent,
);
router.get("/students/:id/attendance", student.getStudentAttendance);
router.get("/students/:id/results", student.getStudentResults);
router.get("/students/:id/fees", student.getStudentFees);
router.get("/students/:id/documents", student.getStudentDocuments);

router.get("/teachers", requireSchoolContext, teacher.getTeachers);
router.post(
  "/teachers",
  allowRoles(...ACADEMIC_MANAGER_ROLES),
  teacher.createTeacher,
);
router.put(
  "/teachers/:id",
  allowRoles(...ACADEMIC_MANAGER_ROLES),
  teacher.updateTeacher,
);
router.delete(
  "/teachers/:id",
  allowRoles(...OWNER_LEVEL_ROLES),
  teacher.deleteTeacher,
);
router.get("/teachers/:id/classes", teacher.getTeacherClasses);
router.get("/teachers/:id/schedule", teacher.getTeacherSchedule);

router.get("/parents", requireSchoolContext, parent.getParents);
router.post(
  "/parents",
  allowRoles(...ACADEMIC_MANAGER_ROLES),
  parent.createParent,
);
router.put(
  "/parents/:id",
  allowRoles(...ACADEMIC_MANAGER_ROLES),
  parent.updateParent,
);
router.get("/parents/:id/students", parent.getParentStudents);

router.get("/classes", classController.getClasses);
router.post(
  "/classes",
  allowRoles(...ACADEMIC_MANAGER_ROLES),
  classController.createClass,
);
router.post(
  "/classes/bulk-delete",
  allowRoles(...OWNER_LEVEL_ROLES),
  classController.bulkDeleteClasses,
);
router.get("/classes/:id", classController.getClassById);
router.post(
  "/classes/:classId/sections",
  allowRoles(...ACADEMIC_MANAGER_ROLES),
  section.createSection,
);
router.put(
  "/classes/:id",
  allowRoles(...ACADEMIC_MANAGER_ROLES),
  classController.updateClass,
);
router.delete(
  "/classes/:id",
  allowRoles(...OWNER_LEVEL_ROLES),
  classController.deleteClass,
);

router.get("/sections", requireSchoolContext, section.getSections);
router.post(
  "/sections",
  allowRoles(...ACADEMIC_MANAGER_ROLES),
  section.createSection,
);
router.post(
  "/sections/bulk-delete",
  allowRoles(...OWNER_LEVEL_ROLES),
  section.bulkDeleteSections,
);
router.get("/sections/:id", section.getSectionById);
router.put(
  "/sections/:id",
  allowRoles(...ACADEMIC_MANAGER_ROLES),
  section.updateSection,
);
router.delete(
  "/sections/:id",
  allowRoles(...OWNER_LEVEL_ROLES),
  section.deleteSection,
);

router.get("/subjects", requireSchoolContext, subject.getSubjects);
router.get("/subjects/class/:classId", subject.getSubjectsByClassId);
router.post(
  "/subjects/bulk",
  requireSchoolContext,
  allowRoles(...ACADEMIC_MANAGER_ROLES),
  subject.bulkCreateSubjects,
);
router.post(
  "/subjects/bulk-delete",
  requireSchoolContext,
  allowRoles(...OWNER_LEVEL_ROLES),
  subject.bulkDeleteSubjects,
);
router.post(
  "/subjects",
  requireSchoolContext,
  allowRoles(...ACADEMIC_MANAGER_ROLES),
  subject.createSubject,
);
router.put(
  "/subjects/:id",
  allowRoles(...ACADEMIC_MANAGER_ROLES),
  subject.updateSubject,
);
router.delete(
  "/subjects/:id",
  allowRoles(...OWNER_LEVEL_ROLES),
  subject.deleteSubject,
);

router.get("/chapters", chapter.getChapters);
router.get("/chapters/subject/:subjectId", chapter.getChaptersBySubjectId);
router.post(
  "/chapters/bulk",
  allowRoles(...CHAPTER_MANAGE_ROLES),
  chapter.bulkCreateChapters,
);
router.post(
  "/chapters/bulk-delete",
  allowRoles(...CHAPTER_MANAGE_ROLES),
  chapter.bulkDeleteChapters,
);
router.post(
  "/chapters",
  allowRoles(...CHAPTER_MANAGE_ROLES),
  chapter.createChapter,
);
router.put(
  "/chapters/:id",
  allowRoles(...CHAPTER_MANAGE_ROLES),
  chapter.updateChapter,
);
router.delete(
  "/chapters/:id",
  allowRoles(...CHAPTER_MANAGE_ROLES),
  chapter.deleteChapter,
);

router.post("/attendance/mark", attendance.markAttendance);
router.get("/attendance/class/:classId", attendance.getAttendanceByClass);
router.get("/attendance/student/:studentId", attendance.getAttendanceByStudent);
router.get("/attendance/rules", attendance.getAttendanceRules);
router.put(
  "/attendance/rules",
  allowRoles(...ATTENDANCE_RULE_MANAGER_ROLES),
  attendance.updateAttendanceRules,
);
router.post(
  "/attendance/check-in",
  allowRoles(...STAFF_ATTENDANCE_ROLES),
  attendance.checkInStaffAttendance,
);
router.post(
  "/attendance/check-out",
  allowRoles(...STAFF_ATTENDANCE_ROLES),
  attendance.checkOutStaffAttendance,
);
router.get(
  "/attendance/me",
  allowRoles(...STAFF_ATTENDANCE_ROLES),
  attendance.getMyStaffAttendance,
);
router.get(
  "/attendance/staff/today",
  requireSchoolContext,
  allowRoles(...OWNER_LEVEL_ROLES),
  attendance.getStaffAttendanceToday,
);
router.put("/attendance/:id", attendance.updateAttendance);

router.get(
  "/exams/schedules",
  allowRoles(...EXAM_VIEW_ROLES),
  exam.getExamSchedules,
);
router.post(
  "/exams/schedules",
  allowRoles(...EXAM_MANAGER_ROLES),
  exam.createExamSchedule,
);
router.get(
  "/exams/schedules/:id",
  allowRoles(...EXAM_VIEW_ROLES),
  exam.getExamScheduleById,
);
router.put(
  "/exams/schedules/:id",
  allowRoles(...EXAM_MANAGER_ROLES),
  exam.updateExamSchedule,
);
router.delete(
  "/exams/schedules/:id",
  allowRoles(...EXAM_MANAGER_ROLES),
  exam.deleteExamSchedule,
);

router.get("/exams", allowRoles(...EXAM_VIEW_ROLES), exam.getExams);
router.post("/exams", allowRoles(...EXAM_MANAGER_ROLES), exam.createExam);
router.get(
  "/exams/:id/marks",
  allowRoles(...EXAM_VIEW_ROLES),
  exam.getExamMarks,
);
router.post(
  "/exams/:id/marks",
  allowRoles(...EXAM_MANAGER_ROLES),
  exam.upsertExamMarks,
);
router.get("/exams/:id", allowRoles(...EXAM_VIEW_ROLES), exam.getExamById);
router.put("/exams/:id", allowRoles(...EXAM_MANAGER_ROLES), exam.updateExam);
router.delete(
  "/exams/:id",
  allowRoles(...EXAM_MANAGER_ROLES),
  exam.deleteExam,
);

router.post("/marks", mark.createMark);
router.get("/marks/student/:id", mark.getMarksByStudent);
router.put("/marks/:id", mark.updateMark);

router.get(
  "/mock-test/generate",
  methodNotAllowed("Use POST /api/mock-tests/generate to generate a mock test"),
);
router.post(
  "/mock-test/generate",
  allowRoles(...MOCK_TEST_GENERATOR_ROLES),
  mockTest.generateMockTest,
);
router.get(
  "/mock-tests/generate",
  methodNotAllowed("Use POST /api/mock-tests/generate to generate a mock test"),
);
router.post(
  "/mock-tests/generate",
  allowRoles(...MOCK_TEST_GENERATOR_ROLES),
  mockTest.generateMockTest,
);
router.post(
  "/mock-tests",
  allowRoles(...MOCK_TEST_MANAGER_ROLES),
  mockTest.createMockTest,
);
router.get("/mock-tests", mockTest.getMockTests);
router.get("/mock-tests/progress", mockTest.getMockTestProgress);
router.post("/mock-tests/submit", mockTest.submitMockTest);
router.get("/mock-tests/result/:id", mockTest.getMockTestResult);
router.get("/mock-tests/ai-suggestion/:id", mockTest.getMockTestAiSuggestion);
router.post(
  "/mock-tests/:id/assign",
  allowRoles(...MOCK_TEST_MANAGER_ROLES),
  mockTest.assignMockTest,
);
router.get("/mock-tests/:id/pdf", mockTest.downloadMockTestPdf);
router.get("/mock-tests/:id", mockTest.getMockTestById);

router.post(
  "/assignments",
  allowRoles(...ASSIGNMENT_MANAGER_ROLES),
  assignment.createAssignment,
);
router.get("/assignments", requireSchoolContext, assignment.getAssignments);
router.post("/assignments/submit", assignment.submitAssignment);
router.get("/assignments/student/:id", assignment.getAssignmentsByStudent);

router.post("/timetable", timetable.createTimetable);
router.get("/timetable/class/:id", timetable.getTimetableByClass);
router.put("/timetable/:id", timetable.updateTimetable);
router.delete("/timetable/:id", allowRoles(...ACADEMIC_MANAGER_ROLES), timetable.deleteTimetable);

router.post("/fees", fee.createFee);
router.get("/fees/me", fee.getMyFees);
router.get("/fees/student/:id", fee.getFeesByStudent);
router.post("/fees/payment", fee.createFeePayment);
router.get("/fees/transactions", fee.getFeeTransactions);
router.get("/fees/defaulters", fee.getFeeDefaulters);
router.post(
  "/fees/:id/offline-payment",
  allowRoles(...OWNER_LEVEL_ROLES),
  fee.markOfflineFeePayment,
);
router.post(
  "/fees/reminders/whatsapp",
  allowRoles(...OWNER_LEVEL_ROLES),
  fee.sendFeeWhatsappReminders,
);

router.get(
  "/inventory",
  allowRoles(...INVENTORY_ROLES),
  inventory.getInventoryItems,
);
router.post(
  "/inventory",
  allowRoles(...INVENTORY_ROLES),
  inventory.createInventoryItem,
);
router.get(
  "/inventory/:id",
  allowRoles(...INVENTORY_ROLES),
  inventory.getInventoryItemById,
);
router.put(
  "/inventory/:id",
  allowRoles(...INVENTORY_ROLES),
  inventory.updateInventoryItem,
);
router.post(
  "/inventory/:id/adjust",
  allowRoles(...INVENTORY_ROLES),
  inventory.adjustInventoryStock,
);
router.delete(
  "/inventory/:id",
  allowRoles(...INVENTORY_ROLES),
  inventory.deleteInventoryItem,
);

router.get(
  "/elearning/playlists",
  allowRoles(...ELEARNING_VIEW_ROLES),
  elearning.getElearningPlaylists,
);
router.post(
  "/elearning/playlists",
  allowRoles(...ELEARNING_MANAGER_ROLES),
  elearning.createElearningPlaylist,
);
router.get(
  "/elearning/playlists/:id",
  allowRoles(...ELEARNING_VIEW_ROLES),
  elearning.getElearningPlaylistById,
);
router.put(
  "/elearning/playlists/:id",
  allowRoles(...ELEARNING_MANAGER_ROLES),
  elearning.updateElearningPlaylist,
);
router.delete(
  "/elearning/playlists/:id",
  allowRoles(...ELEARNING_MANAGER_ROLES),
  elearning.deleteElearningPlaylist,
);

router.get(
  "/elearning/contents",
  allowRoles(...ELEARNING_VIEW_ROLES),
  elearning.getElearningContents,
);
router.post(
  "/elearning/contents",
  allowRoles(...ELEARNING_MANAGER_ROLES),
  elearning.createElearningContent,
);
router.get(
  "/elearning/contents/:id",
  allowRoles(...ELEARNING_VIEW_ROLES),
  elearning.getElearningContentById,
);
router.put(
  "/elearning/contents/:id",
  allowRoles(...ELEARNING_MANAGER_ROLES),
  elearning.updateElearningContent,
);
router.delete(
  "/elearning/contents/:id",
  allowRoles(...ELEARNING_MANAGER_ROLES),
  elearning.deleteElearningContent,
);

router.get(
  "/playground/bundle",
  allowRoles(...PLAYGROUND_VIEW_ROLES),
  playground.getPlaygroundBundle,
);
router.post(
  "/playground/seed",
  allowRoles(...PLAYGROUND_MANAGER_ROLES),
  playground.seedPlaygroundDefaults,
);
router.get(
  "/playground/items",
  allowRoles(...PLAYGROUND_VIEW_ROLES),
  playground.getPlaygroundItems,
);
router.post(
  "/playground/items",
  allowRoles(...PLAYGROUND_MANAGER_ROLES),
  playground.createPlaygroundItem,
);
router.get(
  "/playground/items/:id",
  allowRoles(...PLAYGROUND_VIEW_ROLES),
  playground.getPlaygroundItemById,
);
router.put(
  "/playground/items/:id",
  allowRoles(...PLAYGROUND_MANAGER_ROLES),
  playground.updatePlaygroundItem,
);
router.delete(
  "/playground/items/:id",
  allowRoles(...PLAYGROUND_MANAGER_ROLES),
  playground.deletePlaygroundItem,
);

// Student Lifecycle
router.get(
  "/lifecycle/admissions",
  requireSchoolContext,
  allowRoles(...ACADEMIC_MANAGER_ROLES),
  lifecycle.listAdmissions,
);
router.post(
  "/lifecycle/admissions",
  requireSchoolContext,
  allowRoles(...ACADEMIC_MANAGER_ROLES),
  lifecycle.createAdmission,
);
router.put(
  "/lifecycle/admissions/:id",
  requireSchoolContext,
  allowRoles(...ACADEMIC_MANAGER_ROLES),
  lifecycle.updateAdmission,
);
router.post(
  "/lifecycle/admissions/:id/enroll",
  requireSchoolContext,
  allowRoles(...ACADEMIC_MANAGER_ROLES),
  lifecycle.enrollAdmission,
);
router.post(
  "/lifecycle/promotions",
  requireSchoolContext,
  allowRoles(...ACADEMIC_MANAGER_ROLES),
  lifecycle.promoteStudents,
);
router.get(
  "/lifecycle/documents",
  requireSchoolContext,
  allowRoles(...ACADEMIC_MANAGER_ROLES),
  lifecycle.listDocuments,
);
router.post(
  "/lifecycle/documents",
  requireSchoolContext,
  allowRoles(...ACADEMIC_MANAGER_ROLES),
  lifecycle.createDocument,
);

// Transport
router.get(
  "/transport/vehicles",
  requireSchoolContext,
  allowRoles(...TRANSPORT_MANAGER_ROLES),
  transport.listVehicles,
);
router.post(
  "/transport/vehicles",
  requireSchoolContext,
  allowRoles(...TRANSPORT_MANAGER_ROLES),
  transport.createVehicle,
);
router.put(
  "/transport/vehicles/:id",
  requireSchoolContext,
  allowRoles(...TRANSPORT_MANAGER_ROLES),
  transport.updateVehicle,
);
router.delete(
  "/transport/vehicles/:id",
  requireSchoolContext,
  allowRoles(...OWNER_LEVEL_ROLES),
  transport.deleteVehicle,
);
router.get(
  "/transport/routes",
  requireSchoolContext,
  allowRoles(...TRANSPORT_MANAGER_ROLES),
  transport.listRoutes,
);
router.post(
  "/transport/routes",
  requireSchoolContext,
  allowRoles(...TRANSPORT_MANAGER_ROLES),
  transport.createRoute,
);
router.put(
  "/transport/routes/:id",
  requireSchoolContext,
  allowRoles(...TRANSPORT_MANAGER_ROLES),
  transport.updateRoute,
);
router.delete(
  "/transport/routes/:id",
  requireSchoolContext,
  allowRoles(...OWNER_LEVEL_ROLES),
  transport.deleteRoute,
);
router.get(
  "/transport/assignments",
  requireSchoolContext,
  allowRoles(...TRANSPORT_MANAGER_ROLES),
  transport.listAssignments,
);
router.post(
  "/transport/assignments",
  requireSchoolContext,
  allowRoles(...TRANSPORT_MANAGER_ROLES),
  transport.createAssignment,
);
router.delete(
  "/transport/assignments/:id",
  requireSchoolContext,
  allowRoles(...TRANSPORT_MANAGER_ROLES),
  transport.deleteAssignment,
);

// Hostel
router.get(
  "/hostel/buildings",
  requireSchoolContext,
  allowRoles(...HOSTEL_MANAGER_ROLES),
  hostel.listBuildings,
);
router.post(
  "/hostel/buildings",
  requireSchoolContext,
  allowRoles(...HOSTEL_MANAGER_ROLES),
  hostel.createBuilding,
);
router.put(
  "/hostel/buildings/:id",
  requireSchoolContext,
  allowRoles(...HOSTEL_MANAGER_ROLES),
  hostel.updateBuilding,
);
router.get(
  "/hostel/rooms",
  requireSchoolContext,
  allowRoles(...HOSTEL_MANAGER_ROLES),
  hostel.listRooms,
);
router.post(
  "/hostel/rooms",
  requireSchoolContext,
  allowRoles(...HOSTEL_MANAGER_ROLES),
  hostel.createRoom,
);
router.put(
  "/hostel/rooms/:id",
  requireSchoolContext,
  allowRoles(...HOSTEL_MANAGER_ROLES),
  hostel.updateRoom,
);
router.get(
  "/hostel/allocations",
  requireSchoolContext,
  allowRoles(...HOSTEL_MANAGER_ROLES),
  hostel.listAllocations,
);
router.post(
  "/hostel/allocations",
  requireSchoolContext,
  allowRoles(...HOSTEL_MANAGER_ROLES),
  hostel.createAllocation,
);
router.delete(
  "/hostel/allocations/:id",
  requireSchoolContext,
  allowRoles(...HOSTEL_MANAGER_ROLES),
  hostel.deleteAllocation,
);

// HR / Payroll
router.get(
  "/hr/staff",
  requireSchoolContext,
  allowRoles(...HR_MANAGER_ROLES),
  hr.listStaffProfiles,
);
router.post(
  "/hr/staff",
  requireSchoolContext,
  allowRoles(...HR_MANAGER_ROLES),
  hr.createStaffProfile,
);
router.put(
  "/hr/staff/:id",
  requireSchoolContext,
  allowRoles(...HR_MANAGER_ROLES),
  hr.updateStaffProfile,
);
router.get(
  "/hr/leave-types",
  requireSchoolContext,
  allowRoles(...LEAVE_ACCESS_ROLES),
  hr.listLeaveTypes,
);
router.get(
  "/hr/leaves",
  requireSchoolContext,
  allowRoles(...LEAVE_ACCESS_ROLES),
  hr.listLeaves,
);
router.post(
  "/hr/leaves",
  requireSchoolContext,
  allowRoles(...LEAVE_ACCESS_ROLES),
  hr.createLeave,
);
router.put(
  "/hr/leaves/:id",
  requireSchoolContext,
  allowRoles(...HR_MANAGER_ROLES),
  hr.updateLeave,
);
router.post(
  "/hr/leaves/:id/approve",
  requireSchoolContext,
  allowRoles(...HR_MANAGER_ROLES),
  hr.approveLeave,
);
router.post(
  "/hr/leaves/:id/reject",
  requireSchoolContext,
  allowRoles(...HR_MANAGER_ROLES),
  hr.rejectLeave,
);
router.get(
  "/hr/leave-rules",
  requireSchoolContext,
  allowRoles(...LEAVE_ACCESS_ROLES),
  hr.listLeaveRules,
);
router.post(
  "/hr/leave-rules",
  requireSchoolContext,
  allowRoles(...HR_MANAGER_ROLES),
  hr.createLeaveRule,
);
router.put(
  "/hr/leave-rules/:id",
  requireSchoolContext,
  allowRoles(...HR_MANAGER_ROLES),
  hr.updateLeaveRule,
);
router.delete(
  "/hr/leave-rules/:id",
  requireSchoolContext,
  allowRoles(...HR_MANAGER_ROLES),
  hr.deleteLeaveRule,
);
router.get(
  "/hr/leave-balances",
  requireSchoolContext,
  allowRoles(...LEAVE_ACCESS_ROLES),
  hr.listLeaveBalances,
);
router.post(
  "/hr/leave-balances",
  requireSchoolContext,
  allowRoles(...HR_MANAGER_ROLES),
  hr.upsertLeaveBalance,
);
router.get(
  "/hr/leave-employees",
  requireSchoolContext,
  allowRoles(...HR_MANAGER_ROLES),
  hr.listLeaveEmployees,
);
router.get(
  "/hr/salary-structures",
  requireSchoolContext,
  allowRoles(...HR_MANAGER_ROLES),
  hr.listSalaryStructures,
);
router.post(
  "/hr/salary-structures",
  requireSchoolContext,
  allowRoles(...HR_MANAGER_ROLES),
  hr.createSalaryStructure,
);
router.get(
  "/hr/payroll-runs",
  requireSchoolContext,
  allowRoles(...HR_MANAGER_ROLES),
  hr.listPayrollRuns,
);
router.post(
  "/hr/payroll-runs",
  requireSchoolContext,
  allowRoles(...HR_MANAGER_ROLES),
  hr.createPayrollRun,
);
router.get(
  "/hr/upcoming",
  requireSchoolContext,
  allowRoles(...HR_MANAGER_ROLES),
  hr.getHrUpcoming,
);
router.get(
  "/hr/calendar/upcoming",
  requireSchoolContext,
  allowRoles(...CALENDAR_VIEW_ROLES),
  hr.listUpcomingCalendar,
);
router.get(
  "/hr/calendar",
  requireSchoolContext,
  allowRoles(...CALENDAR_VIEW_ROLES),
  hr.listCalendarItems,
);
router.post(
  "/hr/calendar",
  requireSchoolContext,
  allowRoles(...HR_MANAGER_ROLES),
  hr.createCalendarItem,
);
router.put(
  "/hr/calendar/:id",
  requireSchoolContext,
  allowRoles(...HR_MANAGER_ROLES),
  hr.updateCalendarItem,
);
router.delete(
  "/hr/calendar/:id",
  requireSchoolContext,
  allowRoles(...HR_MANAGER_ROLES),
  hr.deleteCalendarItem,
);

// Notifications
router.get(
  "/notifications",
  requireSchoolContext,
  allowRoles(...NOTIFICATION_VIEW_ROLES),
  notification.listMyNotifications,
);
router.get(
  "/notifications/unread-count",
  requireSchoolContext,
  allowRoles(...NOTIFICATION_VIEW_ROLES),
  notification.getUnreadNotificationCount,
);
router.post(
  "/notifications/notices",
  requireSchoolContext,
  allowRoles(...NOTICE_PUBLISH_ROLES),
  notification.publishNotice,
);
router.patch(
  "/notifications/read-all",
  requireSchoolContext,
  allowRoles(...NOTIFICATION_VIEW_ROLES),
  notification.markAllAsRead,
);
router.patch(
  "/notifications/:id/read",
  requireSchoolContext,
  allowRoles(...NOTIFICATION_VIEW_ROLES),
  notification.markNotificationAsRead,
);

// Analytics
router.get(
  "/analytics/overview",
  requireSchoolContext,
  allowRoles(...ANALYTICS_VIEW_ROLES),
  analytics.getOverview,
);
router.get(
  "/analytics/attendance",
  requireSchoolContext,
  allowRoles(...ANALYTICS_VIEW_ROLES),
  analytics.getAttendanceAnalytics,
);
router.get(
  "/analytics/attendance/timeseries",
  requireSchoolContext,
  allowRoles(...ANALYTICS_VIEW_ROLES),
  analytics.getAttendanceTimeseries,
);
router.get(
  "/analytics/finance",
  requireSchoolContext,
  allowRoles(...ANALYTICS_VIEW_ROLES, ...FINANCE_MANAGER_ROLES),
  analytics.getFinanceAnalytics,
);
router.get(
  "/analytics/finance/timeseries",
  requireSchoolContext,
  allowRoles(...ANALYTICS_VIEW_ROLES, ...FINANCE_MANAGER_ROLES),
  analytics.getFinanceTimeseries,
);
router.get(
  "/analytics/classes/summary",
  requireSchoolContext,
  allowRoles(...ANALYTICS_VIEW_ROLES),
  analytics.getClassSummary,
);
router.get(
  "/analytics/reports",
  requireSchoolContext,
  allowRoles(...ANALYTICS_VIEW_ROLES, ...FINANCE_MANAGER_ROLES),
  analytics.getReports,
);
router.get(
  "/dashboard/reports",
  requireSchoolContext,
  allowRoles(...ANALYTICS_VIEW_ROLES, ...FINANCE_MANAGER_ROLES),
  analytics.getReports,
);

export default router;
