"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFeesByStudent = exports.createFee = exports.updateTimetable = exports.getTimetableByClass = exports.createTimetable = exports.getAssignmentsByStudent = exports.submitAssignment = exports.getAssignments = exports.createAssignment = exports.getMockTestAiSuggestion = exports.getMockTestResult = exports.submitMockTest = exports.generateMockTest = exports.updateMark = exports.getMarksByStudent = exports.createMark = exports.updateExam = exports.getExamById = exports.getExams = exports.createExam = exports.updateAttendance = exports.getAttendanceByStudent = exports.getAttendanceByClass = exports.markAttendance = exports.deleteSubject = exports.updateSubject = exports.createSubject = exports.getSubjects = exports.createSection = exports.getSections = exports.deleteClass = exports.updateClass = exports.createClass = exports.getClasses = exports.updateParent = exports.createParent = exports.getParents = exports.deleteTeacher = exports.updateTeacher = exports.createTeacher = exports.getTeachers = exports.deleteStudent = exports.updateStudent = exports.getStudentById = exports.createStudent = exports.getStudents = exports.updateSchool = exports.getSchoolById = exports.createSchool = exports.getSchools = void 0;
exports.getParentStudents = exports.getTeacherSchedule = exports.getTeacherClasses = exports.getStudentDocuments = exports.getStudentFees = exports.getStudentResults = exports.getStudentAttendance = exports.getFeeDefaulters = exports.getFeeTransactions = exports.createFeePayment = void 0;
const school_model_1 = __importDefault(require("../models/school.model"));
const student_model_1 = __importDefault(require("../models/student.model"));
const teacher_model_1 = __importDefault(require("../models/teacher.model"));
const parent_model_1 = __importDefault(require("../models/parent.model"));
const parent_student_model_1 = __importDefault(require("../models/parent-student.model"));
const teacher_class_model_1 = __importDefault(require("../models/teacher-class.model"));
const class_model_1 = __importDefault(require("../models/class.model"));
const section_model_1 = __importDefault(require("../models/section.model"));
const subject_model_1 = __importDefault(require("../models/subject.model"));
const attendance_model_1 = __importDefault(require("../models/attendance.model"));
const exam_model_1 = __importDefault(require("../models/exam.model"));
const mark_model_1 = __importDefault(require("../models/mark.model"));
const student_document_model_1 = __importDefault(require("../models/student-document.model"));
const assignment_model_1 = __importDefault(require("../models/assignment.model"));
const assignment_submission_model_1 = __importDefault(require("../models/assignment-submission.model"));
const timetable_model_1 = __importDefault(require("../models/timetable.model"));
const fee_model_1 = __importDefault(require("../models/fee.model"));
const fee_payment_model_1 = __importDefault(require("../models/fee-payment.model"));
const mock_test_model_1 = __importDefault(require("../models/mock-test.model"));
const list = (model, key) => (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rows = yield model.findAll({ order: [["id", "DESC"]] });
        res.json({ [key]: rows });
    }
    catch (err) {
        next(err);
    }
});
const create = (model, key) => (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const row = yield model.create((_a = req.body) !== null && _a !== void 0 ? _a : {});
        res.status(201).json({ message: `${key} created successfully`, [key]: row });
    }
    catch (err) {
        next(err);
    }
});
const getById = (model, key) => (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const row = yield model.findByPk(String(req.params.id));
        if (!row)
            return res.status(404).json({ message: `${key} not found` });
        res.json({ [key]: row });
    }
    catch (err) {
        next(err);
    }
});
const update = (model, key) => (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const row = yield model.findByPk(String(req.params.id));
        if (!row)
            return res.status(404).json({ message: `${key} not found` });
        yield row.update((_a = req.body) !== null && _a !== void 0 ? _a : {});
        res.json({ message: `${key} updated successfully`, [key]: row });
    }
    catch (err) {
        next(err);
    }
});
const remove = (model, key) => (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const row = yield model.findByPk(String(req.params.id));
        if (!row)
            return res.status(404).json({ message: `${key} not found` });
        yield row.destroy();
        res.json({ message: `${key} deleted successfully` });
    }
    catch (err) {
        next(err);
    }
});
exports.getSchools = list(school_model_1.default, "schools");
exports.createSchool = create(school_model_1.default, "school");
exports.getSchoolById = getById(school_model_1.default, "school");
exports.updateSchool = update(school_model_1.default, "school");
exports.getStudents = list(student_model_1.default, "students");
exports.createStudent = create(student_model_1.default, "student");
exports.getStudentById = getById(student_model_1.default, "student");
exports.updateStudent = update(student_model_1.default, "student");
exports.deleteStudent = remove(student_model_1.default, "student");
exports.getTeachers = list(teacher_model_1.default, "teachers");
exports.createTeacher = create(teacher_model_1.default, "teacher");
exports.updateTeacher = update(teacher_model_1.default, "teacher");
exports.deleteTeacher = remove(teacher_model_1.default, "teacher");
exports.getParents = list(parent_model_1.default, "parents");
const createParent = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const _b = (_a = req.body) !== null && _a !== void 0 ? _a : {}, { studentIds } = _b, payload = __rest(_b, ["studentIds"]);
        const parent = yield parent_model_1.default.create(payload);
        if (Array.isArray(studentIds)) {
            yield parent_student_model_1.default.bulkCreate(studentIds.map((studentId) => ({ parentId: parent.id, studentId })), { ignoreDuplicates: true });
        }
        res.status(201).json({ message: "parent created successfully", parent });
    }
    catch (err) {
        next(err);
    }
});
exports.createParent = createParent;
exports.updateParent = update(parent_model_1.default, "parent");
exports.getClasses = list(class_model_1.default, "classes");
exports.createClass = create(class_model_1.default, "class");
exports.updateClass = update(class_model_1.default, "class");
exports.deleteClass = remove(class_model_1.default, "class");
exports.getSections = list(section_model_1.default, "sections");
exports.createSection = create(section_model_1.default, "section");
exports.getSubjects = list(subject_model_1.default, "subjects");
exports.createSubject = create(subject_model_1.default, "subject");
exports.updateSubject = update(subject_model_1.default, "subject");
exports.deleteSubject = remove(subject_model_1.default, "subject");
exports.markAttendance = create(attendance_model_1.default, "attendance");
const getAttendanceByClass = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const attendance = yield attendance_model_1.default.findAll({
            where: { classId: req.params.classId },
            order: [["date", "DESC"]],
        });
        res.json({ attendance });
    }
    catch (err) {
        next(err);
    }
});
exports.getAttendanceByClass = getAttendanceByClass;
const getAttendanceByStudent = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const attendance = yield attendance_model_1.default.findAll({
            where: { studentId: req.params.studentId },
            order: [["date", "DESC"]],
        });
        res.json({ attendance });
    }
    catch (err) {
        next(err);
    }
});
exports.getAttendanceByStudent = getAttendanceByStudent;
exports.updateAttendance = update(attendance_model_1.default, "attendance");
exports.createExam = create(exam_model_1.default, "exam");
exports.getExams = list(exam_model_1.default, "exams");
exports.getExamById = getById(exam_model_1.default, "exam");
exports.updateExam = update(exam_model_1.default, "exam");
exports.createMark = create(mark_model_1.default, "mark");
const getMarksByStudent = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const marks = yield mark_model_1.default.findAll({ where: { studentId: req.params.id } });
        res.json({ marks });
    }
    catch (err) {
        next(err);
    }
});
exports.getMarksByStudent = getMarksByStudent;
exports.updateMark = update(mark_model_1.default, "mark");
exports.generateMockTest = create(mock_test_model_1.default, "mockTest");
const submitMockTest = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { mockTestId, submittedAnswers, result, aiSuggestion } = (_a = req.body) !== null && _a !== void 0 ? _a : {};
        const mockTest = yield mock_test_model_1.default.findByPk(mockTestId);
        if (!mockTest)
            return res.status(404).json({ message: "mockTest not found" });
        yield mockTest.update({
            submittedAnswers,
            result,
            aiSuggestion,
            status: "submitted",
        });
        res.json({ message: "mock test submitted successfully", mockTest });
    }
    catch (err) {
        next(err);
    }
});
exports.submitMockTest = submitMockTest;
exports.getMockTestResult = getById(mock_test_model_1.default, "mockTest");
const getMockTestAiSuggestion = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const mockTest = yield mock_test_model_1.default.findByPk(String(req.params.id));
        if (!mockTest)
            return res.status(404).json({ message: "mockTest not found" });
        res.json({ aiSuggestion: mockTest.aiSuggestion, result: mockTest.result });
    }
    catch (err) {
        next(err);
    }
});
exports.getMockTestAiSuggestion = getMockTestAiSuggestion;
exports.createAssignment = create(assignment_model_1.default, "assignment");
exports.getAssignments = list(assignment_model_1.default, "assignments");
exports.submitAssignment = create(assignment_submission_model_1.default, "submission");
const getAssignmentsByStudent = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const submissions = yield assignment_submission_model_1.default.findAll({
            where: { studentId: req.params.id },
        });
        res.json({ submissions });
    }
    catch (err) {
        next(err);
    }
});
exports.getAssignmentsByStudent = getAssignmentsByStudent;
exports.createTimetable = create(timetable_model_1.default, "timetable");
const getTimetableByClass = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const timetable = yield timetable_model_1.default.findAll({ where: { classId: req.params.id } });
        res.json({ timetable });
    }
    catch (err) {
        next(err);
    }
});
exports.getTimetableByClass = getTimetableByClass;
exports.updateTimetable = update(timetable_model_1.default, "timetable");
exports.createFee = create(fee_model_1.default, "fee");
const getFeesByStudent = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const fees = yield fee_model_1.default.findAll({ where: { studentId: req.params.id } });
        res.json({ fees });
    }
    catch (err) {
        next(err);
    }
});
exports.getFeesByStudent = getFeesByStudent;
const createFeePayment = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const payment = yield fee_payment_model_1.default.create((_a = req.body) !== null && _a !== void 0 ? _a : {});
        if (payment.status === "success") {
            yield fee_model_1.default.update({ status: "paid" }, { where: { id: payment.feeId } });
        }
        res.status(201).json({ message: "payment created successfully", payment });
    }
    catch (err) {
        next(err);
    }
});
exports.createFeePayment = createFeePayment;
exports.getFeeTransactions = list(fee_payment_model_1.default, "transactions");
const getFeeDefaulters = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const fees = yield fee_model_1.default.findAll({ where: { status: ["pending", "partial", "overdue"] } });
        res.json({ defaulters: fees });
    }
    catch (err) {
        next(err);
    }
});
exports.getFeeDefaulters = getFeeDefaulters;
const getStudentAttendance = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    req.params.studentId = req.params.id;
    return (0, exports.getAttendanceByStudent)(req, res, next);
});
exports.getStudentAttendance = getStudentAttendance;
const getStudentResults = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    req.params.id = req.params.id;
    return (0, exports.getMarksByStudent)(req, res, next);
});
exports.getStudentResults = getStudentResults;
exports.getStudentFees = exports.getFeesByStudent;
const getStudentDocuments = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const documents = yield student_document_model_1.default.findAll({ where: { studentId: req.params.id } });
        res.json({ documents });
    }
    catch (err) {
        next(err);
    }
});
exports.getStudentDocuments = getStudentDocuments;
const getTeacherClasses = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const classes = yield teacher_class_model_1.default.findAll({ where: { teacherId: req.params.id } });
        res.json({ classes });
    }
    catch (err) {
        next(err);
    }
});
exports.getTeacherClasses = getTeacherClasses;
const getTeacherSchedule = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const schedule = yield timetable_model_1.default.findAll({ where: { teacherId: req.params.id } });
        res.json({ schedule });
    }
    catch (err) {
        next(err);
    }
});
exports.getTeacherSchedule = getTeacherSchedule;
const getParentStudents = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const students = yield parent_student_model_1.default.findAll({ where: { parentId: req.params.id } });
        res.json({ students });
    }
    catch (err) {
        next(err);
    }
});
exports.getParentStudents = getParentStudents;
