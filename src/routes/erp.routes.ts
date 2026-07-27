import { Router } from "express";
import { allowRoles, verifyToken } from "../middlewares/auth.middleware";
import * as school from "../controllers/school.controller";
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
import {
  ACADEMIC_MANAGER_ROLES,
  ATTENDANCE_RULE_MANAGER_ROLES,
  CHAPTER_MANAGE_ROLES,
  ELEARNING_MANAGER_ROLES,
  ELEARNING_VIEW_ROLES,
  EXAM_MANAGER_ROLES,
  EXAM_VIEW_ROLES,
  MOCK_TEST_GENERATOR_ROLES,
  INVENTORY_ROLES,
  MOCK_TEST_MANAGER_ROLES,
  OWNER_LEVEL_ROLES,
  SCHOOL_CREATION_ROLES,
  STAFF_ATTENDANCE_ROLES,
} from "../utils/roles";

const router = Router();

router.use(verifyToken);

const methodNotAllowed = (message: string) => (_req: any, res: any) => {
  res.status(405).json({ message });
};

router.get("/schools", school.getSchools);
router.post("/schools", allowRoles(...SCHOOL_CREATION_ROLES), school.createSchool);
router.get("/schools/:id", school.getSchoolById);
router.put(
  "/schools/:id",
  allowRoles(...OWNER_LEVEL_ROLES),
  school.updateSchool,
);

router.get("/students", student.getStudents);
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

router.get("/teachers", teacher.getTeachers);
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

router.get("/parents", parent.getParents);
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

router.get("/sections", section.getSections);
router.post(
  "/sections",
  allowRoles(...ACADEMIC_MANAGER_ROLES),
  section.createSection,
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

router.get("/subjects", subject.getSubjects);
router.get("/subjects/class/:classId", subject.getSubjectsByClassId);
router.post(
  "/subjects/bulk",
  allowRoles(...ACADEMIC_MANAGER_ROLES),
  subject.bulkCreateSubjects,
);
router.post(
  "/subjects",
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

router.post("/assignments", assignment.createAssignment);
router.get("/assignments", assignment.getAssignments);
router.post("/assignments/submit", assignment.submitAssignment);
router.get("/assignments/student/:id", assignment.getAssignmentsByStudent);

router.post("/timetable", timetable.createTimetable);
router.get("/timetable/class/:id", timetable.getTimetableByClass);
router.put("/timetable/:id", timetable.updateTimetable);

router.post("/fees", fee.createFee);
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

export default router;
