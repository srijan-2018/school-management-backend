import { Router } from "express";
import { allowRoles, verifyToken } from "../middlewares/auth.middleware";
import * as school from "../controllers/school.controller";
import * as student from "../controllers/student.controller";
import * as teacher from "../controllers/teacher.controller";
import * as parent from "../controllers/parent.controller";
import * as classController from "../controllers/class.controller";
import * as section from "../controllers/section.controller";
import * as subject from "../controllers/subject.controller";
import * as attendance from "../controllers/attendance.controller";
import * as exam from "../controllers/exam.controller";
import * as mark from "../controllers/mark.controller";
import * as mockTest from "../controllers/mock-test.controller";
import * as assignment from "../controllers/assignment.controller";
import * as timetable from "../controllers/timetable.controller";
import * as fee from "../controllers/fee.controller";

const router = Router();

router.use(verifyToken);

router.get("/schools", school.getSchools);
router.post("/schools", allowRoles("admin", "school_owner"), school.createSchool);
router.get("/schools/:id", school.getSchoolById);
router.put("/schools/:id", allowRoles("admin", "school_owner"), school.updateSchool);

router.get("/students", student.getStudents);
router.post("/students", allowRoles("admin", "school_owner", "head_teacher"), student.createStudent);
router.get("/students/:id", student.getStudentById);
router.put("/students/:id", allowRoles("admin", "school_owner", "head_teacher"), student.updateStudent);
router.delete("/students/:id", allowRoles("admin", "school_owner"), student.deleteStudent);
router.get("/students/:id/attendance", student.getStudentAttendance);
router.get("/students/:id/results", student.getStudentResults);
router.get("/students/:id/fees", student.getStudentFees);
router.get("/students/:id/documents", student.getStudentDocuments);

router.get("/teachers", teacher.getTeachers);
router.post("/teachers", allowRoles("admin", "school_owner", "head_teacher"), teacher.createTeacher);
router.put("/teachers/:id", allowRoles("admin", "school_owner", "head_teacher"), teacher.updateTeacher);
router.delete("/teachers/:id", allowRoles("admin", "school_owner"), teacher.deleteTeacher);
router.get("/teachers/:id/classes", teacher.getTeacherClasses);
router.get("/teachers/:id/schedule", teacher.getTeacherSchedule);

router.get("/parents", parent.getParents);
router.post("/parents", allowRoles("admin", "school_owner", "head_teacher"), parent.createParent);
router.put("/parents/:id", allowRoles("admin", "school_owner", "head_teacher"), parent.updateParent);
router.get("/parents/:id/students", parent.getParentStudents);

router.get("/classes", classController.getClasses);
router.post("/classes", allowRoles("admin", "school_owner", "head_teacher"), classController.createClass);
router.put("/classes/:id", allowRoles("admin", "school_owner", "head_teacher"), classController.updateClass);
router.delete("/classes/:id", allowRoles("admin", "school_owner"), classController.deleteClass);

router.get("/sections", section.getSections);
router.post("/sections", allowRoles("admin", "school_owner", "head_teacher"), section.createSection);

router.get("/subjects", subject.getSubjects);
router.post("/subjects", allowRoles("admin", "school_owner", "head_teacher"), subject.createSubject);
router.put("/subjects/:id", allowRoles("admin", "school_owner", "head_teacher"), subject.updateSubject);
router.delete("/subjects/:id", allowRoles("admin", "school_owner"), subject.deleteSubject);

router.post("/attendance/mark", attendance.markAttendance);
router.get("/attendance/class/:classId", attendance.getAttendanceByClass);
router.get("/attendance/student/:studentId", attendance.getAttendanceByStudent);
router.put("/attendance/:id", attendance.updateAttendance);

router.post("/exams", exam.createExam);
router.get("/exams", exam.getExams);
router.get("/exams/:id", exam.getExamById);
router.put("/exams/:id", exam.updateExam);

router.post("/marks", mark.createMark);
router.get("/marks/student/:id", mark.getMarksByStudent);
router.put("/marks/:id", mark.updateMark);

router.post("/mock-test/generate", mockTest.generateMockTest);
router.post("/mock-test/submit", mockTest.submitMockTest);
router.get("/mock-test/result/:id", mockTest.getMockTestResult);
router.get("/mock-test/ai-suggestion/:id", mockTest.getMockTestAiSuggestion);

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

export default router;
