import { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import ExamSchedule, {
  EXAM_SCHEDULE_STATUSES,
  type ExamScheduleStatus,
} from "../models/exam-schedule.model";
import Exam, { EXAM_STATUSES, type ExamStatus } from "../models/exam.model";
import Mark from "../models/mark.model";
import Class from "../models/class.model";
import School from "../models/school.model";
import Subject from "../models/subject.model";
import Student from "../models/student.model";
import Parent from "../models/parent.model";
import User from "../models/user.model";
import Section from "../models/section.model";
import { AppError } from "../middlewares/error.middleware";
import { buildPagination, getPagination } from "../utils/pagination";
import {
  EXAM_MANAGER_ROLES,
  EXAM_VIEW_ROLES,
  normalizeRole,
} from "../utils/roles";

const userSafeAttributes = {
  exclude: ["password", "resetPasswordToken", "resetPasswordExpires"],
};

const getActor = (req: Request) => {
  const role = normalizeRole((req as any).user?.role);
  const userId = Number((req as any).user?.id);
  const contextSchoolId = Number(req.schoolId);
  const jwtSchoolId = Number((req as any).user?.schoolId);
  const schoolId =
    Number.isInteger(contextSchoolId) && contextSchoolId > 0
      ? contextSchoolId
      : jwtSchoolId;

  if (!role || !EXAM_VIEW_ROLES.includes(role)) {
    throw new AppError("Access denied", 403);
  }

  if (!Number.isInteger(schoolId) || schoolId <= 0) {
    throw new AppError("School context is required", 400);
  }

  return {
    role,
    userId: Number.isInteger(userId) && userId > 0 ? userId : null,
    schoolId,
    canManage: EXAM_MANAGER_ROLES.includes(role),
  };
};

const toOptionalPositiveInteger = (value: unknown, field: string) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${field} must be a positive integer`, 400);
  }

  return parsed;
};

const toOptionalClassId = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return toOptionalPositiveInteger(value, "classId");
};

const normalizeScheduleStatus = (value: unknown): ExamScheduleStatus => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!EXAM_SCHEDULE_STATUSES.includes(normalized as ExamScheduleStatus)) {
    throw new AppError(
      `Invalid schedule status. Allowed values: ${EXAM_SCHEDULE_STATUSES.join(", ")}`,
      400,
    );
  }

  return normalized as ExamScheduleStatus;
};

const normalizeExamStatus = (value: unknown): ExamStatus => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!EXAM_STATUSES.includes(normalized as ExamStatus)) {
    throw new AppError(
      `Invalid exam status. Allowed values: ${EXAM_STATUSES.join(", ")}`,
      400,
    );
  }

  return normalized as ExamStatus;
};

const ensureManageAccess = (req: Request) => {
  const actor = getActor(req);

  if (!actor.canManage) {
    throw new AppError("Only staff can manage exams", 403);
  }

  return actor;
};

const getStudentRecord = async (userId: number | null) => {
  if (!userId) {
    return null;
  }

  return Student.findOne({ where: { userId } });
};

const getStudentClassId = async (userId: number | null) => {
  const student = await getStudentRecord(userId);

  return student ? Number(student.get("classId")) : null;
};

const getStudentId = async (userId: number | null) => {
  const student = await getStudentRecord(userId);

  return student ? Number(student.get("id")) : null;
};

const getParentLinkedClassIds = async (userId: number | null) => {
  if (!userId) {
    return [] as number[];
  }

  const parent: any = await Parent.findOne({
    where: { userId },
    include: [
      {
        model: Student,
        attributes: ["id", "classId"],
        through: { attributes: [] },
      },
    ],
  });

  if (!parent) {
    return [] as number[];
  }

  const students = Array.isArray(parent.Students)
    ? parent.Students
    : Array.isArray(parent.students)
      ? parent.students
      : [];

  const classIds = students
    .map((student: any) => Number(student.classId ?? student.get?.("classId")))
    .filter((id: number) => Number.isInteger(id) && id > 0);

  return Array.from(new Set(classIds));
};

const ensureClassExists = async (classId: number | null) => {
  if (!classId) {
    return;
  }

  const selectedClass = await Class.findByPk(classId);

  if (!selectedClass) {
    throw new AppError("Class not found", 404);
  }
};

const ensureSubjectExists = async (subjectId: number | null | undefined) => {
  if (!subjectId) {
    return;
  }

  const subject = await Subject.findByPk(subjectId);

  if (!subject) {
    throw new AppError("Subject not found", 404);
  }
};

const buildClassAccessWhere = async (req: Request, classIdField = "classId") => {
  const actor = getActor(req);
  const where: Record<string, unknown> = {
    schoolId: actor.schoolId,
  };
  const requestedClassId = toOptionalPositiveInteger(req.query.classId, "classId");

  if (actor.role === "student") {
    const studentClassId = await getStudentClassId(actor.userId);

    if (!studentClassId) {
      throw new AppError("Student class is not assigned", 400);
    }

    where[Op.or as unknown as string] = [
      { [classIdField]: null },
      { [classIdField]: studentClassId },
    ];
  } else if (actor.role === "parent") {
    const linkedClassIds = await getParentLinkedClassIds(actor.userId);

    if (!linkedClassIds.length) {
      // No linked children — return empty result set rather than school-wide exams.
      where[classIdField] = -1;
      return where;
    }

    if (requestedClassId) {
      if (!linkedClassIds.includes(requestedClassId)) {
        throw new AppError("Access denied", 403);
      }

      where[Op.or as unknown as string] = [
        { [classIdField]: null },
        { [classIdField]: requestedClassId },
      ];
    } else {
      where[Op.or as unknown as string] = [
        { [classIdField]: null },
        { [classIdField]: { [Op.in]: linkedClassIds } },
      ];
    }
  } else if (requestedClassId) {
    where[classIdField] = requestedClassId;
  }

  return where;
};

const ensureResourceAccess = async (
  req: Request,
  resource: any,
  classIdField = "classId",
) => {
  const actor = getActor(req);

  if (Number(resource.schoolId) !== actor.schoolId) {
    throw new AppError("Access denied", 403);
  }

  if (actor.role === "student") {
    const studentClassId = await getStudentClassId(actor.userId);
    const resourceClassId = resource[classIdField];

    if (
      resourceClassId !== null &&
      resourceClassId !== undefined &&
      Number(resourceClassId) !== Number(studentClassId)
    ) {
      throw new AppError("Access denied", 403);
    }
  }

  if (actor.role === "parent") {
    const linkedClassIds = await getParentLinkedClassIds(actor.userId);
    const resourceClassId = resource[classIdField];

    if (
      resourceClassId !== null &&
      resourceClassId !== undefined &&
      !linkedClassIds.includes(Number(resourceClassId))
    ) {
      throw new AppError("Access denied", 403);
    }
  }
};

const scheduleInclude = [
  { model: School, attributes: ["id", "name"] },
  { model: Class, attributes: ["id", "name", "section"] },
  {
    model: User,
    as: "createdBy",
    attributes: userSafeAttributes,
  },
];

const examInclude = [
  { model: School, attributes: ["id", "name"] },
  { model: Class, attributes: ["id", "name", "section"] },
  { model: Subject, attributes: ["id", "name"] },
  {
    model: ExamSchedule,
    attributes: ["id", "title", "classId", "status"],
  },
  {
    model: User,
    as: "createdBy",
    attributes: userSafeAttributes,
  },
];

const markInclude = [
  {
    model: Student,
    include: [
      {
        model: User,
        attributes: userSafeAttributes,
      },
      { model: Class, attributes: ["id", "name", "section"] },
      { model: Section, attributes: ["id", "name"] },
    ],
  },
  {
    model: Exam,
    attributes: ["id", "name", "totalMarks", "passingMarks", "date"],
  },
];

const resolveExamDate = (body: Record<string, unknown>) => {
  if (body.date !== undefined) {
    return String(body.date).trim() || null;
  }

  if (body.examDate !== undefined) {
    return String(body.examDate).trim() || null;
  }

  return undefined;
};

export const getExamSchedules = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const where = await buildClassAccessWhere(req);
    const search = String(req.query.search ?? "").trim();
    const status = String(req.query.status ?? "").trim().toLowerCase();

    if (status) {
      where.status = normalizeScheduleStatus(status);
    }

    if (search) {
      const searchLike = `%${search}%`;
      where[Op.and as unknown as string] = [
        ...(Array.isArray(where[Op.and as unknown as string])
          ? (where[Op.and as unknown as string] as unknown[])
          : []),
        {
          [Op.or]: [
            { title: { [Op.like]: searchLike } },
            { description: { [Op.like]: searchLike } },
            { term: { [Op.like]: searchLike } },
            { academicYear: { [Op.like]: searchLike } },
          ],
        },
      ];
    }

    const { rows: schedules, count } = await ExamSchedule.findAndCountAll({
      where,
      include: scheduleInclude,
      order: [["id", "DESC"]],
      distinct: true,
      limit,
      offset,
    });

    res.json({
      schedules,
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};

export const createExamSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const actor = ensureManageAccess(req);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const title = String(body.title ?? "").trim();

    if (!title) {
      return res.status(400).json({ message: "title is required" });
    }

    const classId = toOptionalClassId(body.classId);
    await ensureClassExists(classId);

    const schedule = await ExamSchedule.create({
      schoolId: actor.schoolId,
      title,
      description:
        body.description !== undefined
          ? String(body.description).trim() || null
          : null,
      classId,
      academicYear:
        body.academicYear !== undefined
          ? String(body.academicYear).trim() || null
          : null,
      term: body.term !== undefined ? String(body.term).trim() || null : null,
      status:
        body.status !== undefined
          ? normalizeScheduleStatus(body.status)
          : "draft",
      createdByUserId: actor.userId,
    });

    const createdSchedule = await ExamSchedule.findByPk(schedule.get("id"), {
      include: scheduleInclude,
    });

    res.status(201).json({
      message: "Exam schedule created successfully",
      schedule: createdSchedule,
    });
  } catch (err) {
    next(err);
  }
};

export const getExamScheduleById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schedule: any = await ExamSchedule.findByPk(String(req.params.id), {
      include: [
        ...scheduleInclude,
        {
          model: Exam,
          as: "exams",
          include: [
            { model: Subject, attributes: ["id", "name"] },
            { model: Class, attributes: ["id", "name", "section"] },
          ],
          separate: true,
          order: [
            ["sortOrder", "ASC"],
            ["id", "ASC"],
          ],
        },
      ],
    });

    if (!schedule) {
      return res.status(404).json({ message: "Exam schedule not found" });
    }

    await ensureResourceAccess(req, schedule);

    res.json({ schedule });
  } catch (err) {
    next(err);
  }
};

export const updateExamSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    ensureManageAccess(req);
    const schedule: any = await ExamSchedule.findByPk(String(req.params.id));

    if (!schedule) {
      return res.status(404).json({ message: "Exam schedule not found" });
    }

    await ensureResourceAccess(req, schedule);

    const body = (req.body ?? {}) as Record<string, unknown>;

    if (body.title !== undefined) {
      const title = String(body.title).trim();

      if (!title) {
        return res.status(400).json({ message: "title cannot be empty" });
      }

      schedule.title = title;
    }

    if (body.description !== undefined) {
      schedule.description = String(body.description).trim() || null;
    }

    if (body.classId !== undefined) {
      const classId = toOptionalClassId(body.classId);
      await ensureClassExists(classId);
      schedule.classId = classId;
    }

    if (body.academicYear !== undefined) {
      schedule.academicYear = String(body.academicYear).trim() || null;
    }

    if (body.term !== undefined) {
      schedule.term = String(body.term).trim() || null;
    }

    if (body.status !== undefined) {
      schedule.status = normalizeScheduleStatus(body.status);
    }

    await schedule.save();

    const updatedSchedule = await ExamSchedule.findByPk(schedule.id, {
      include: scheduleInclude,
    });

    res.json({
      message: "Exam schedule updated successfully",
      schedule: updatedSchedule,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteExamSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    ensureManageAccess(req);
    const schedule: any = await ExamSchedule.findByPk(String(req.params.id));

    if (!schedule) {
      return res.status(404).json({ message: "Exam schedule not found" });
    }

    await ensureResourceAccess(req, schedule);
    await schedule.destroy();

    res.json({ message: "Exam schedule deleted successfully" });
  } catch (err) {
    next(err);
  }
};

export const getExams = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const where = await buildClassAccessWhere(req);
    const scheduleId = toOptionalPositiveInteger(req.query.scheduleId, "scheduleId");
    const subjectId = toOptionalPositiveInteger(req.query.subjectId, "subjectId");
    const status = String(req.query.status ?? "").trim().toLowerCase();
    const search = String(req.query.search ?? "").trim();

    if (scheduleId) {
      where.scheduleId = scheduleId;
    }

    if (subjectId) {
      where.subjectId = subjectId;
    }

    if (status) {
      where.status = normalizeExamStatus(status);
    }

    if (search) {
      const searchLike = `%${search}%`;
      where[Op.and as unknown as string] = [
        ...(Array.isArray(where[Op.and as unknown as string])
          ? (where[Op.and as unknown as string] as unknown[])
          : []),
        {
          [Op.or]: [
            { name: { [Op.like]: searchLike } },
            { description: { [Op.like]: searchLike } },
          ],
        },
      ];
    }

    const { rows: exams, count } = await Exam.findAndCountAll({
      where,
      include: examInclude,
      order: [
        ["sortOrder", "ASC"],
        ["id", "DESC"],
      ],
      distinct: true,
      subQuery: false,
      limit,
      offset,
    });

    res.json({
      exams,
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};

export const createExam = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const actor = ensureManageAccess(req);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    const classId = toOptionalClassId(body.classId);
    const scheduleId = toOptionalPositiveInteger(body.scheduleId, "scheduleId");
    const subjectId = toOptionalPositiveInteger(body.subjectId, "subjectId");
    await ensureClassExists(classId);
    await ensureSubjectExists(subjectId);

    if (scheduleId) {
      const schedule = await ExamSchedule.findByPk(scheduleId);

      if (!schedule || Number(schedule.get("schoolId")) !== actor.schoolId) {
        return res.status(404).json({ message: "Exam schedule not found" });
      }
    }

    const exam = await Exam.create({
      schoolId: actor.schoolId,
      scheduleId: scheduleId ?? null,
      name,
      description:
        body.description !== undefined
          ? String(body.description).trim() || null
          : null,
      classId,
      subjectId: subjectId ?? null,
      date: resolveExamDate(body) ?? null,
      startTime:
        body.startTime !== undefined ? String(body.startTime).trim() || null : null,
      endTime:
        body.endTime !== undefined ? String(body.endTime).trim() || null : null,
      durationMinutes:
        body.durationMinutes !== undefined
          ? Number(body.durationMinutes) || null
          : null,
      totalMarks:
        body.totalMarks !== undefined ? Number(body.totalMarks) || null : null,
      passingMarks:
        body.passingMarks !== undefined
          ? Number(body.passingMarks) || null
          : null,
      status:
        body.status !== undefined
          ? normalizeExamStatus(body.status)
          : "scheduled",
      sortOrder:
        body.sortOrder !== undefined ? Number(body.sortOrder) || 0 : 0,
      createdByUserId: actor.userId,
    });

    const createdExam = await Exam.findByPk(exam.get("id"), {
      include: examInclude,
    });

    res.status(201).json({
      message: "Exam created successfully",
      exam: createdExam,
    });
  } catch (err) {
    next(err);
  }
};

export const getExamById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const exam: any = await Exam.findByPk(String(req.params.id), {
      include: examInclude,
    });

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    await ensureResourceAccess(req, exam);

    res.json({ exam });
  } catch (err) {
    next(err);
  }
};

export const updateExam = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    ensureManageAccess(req);
    const exam: any = await Exam.findByPk(String(req.params.id));

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    await ensureResourceAccess(req, exam);

    const body = (req.body ?? {}) as Record<string, unknown>;

    if (body.name !== undefined) {
      const name = String(body.name).trim();

      if (!name) {
        return res.status(400).json({ message: "name cannot be empty" });
      }

      exam.name = name;
    }

    if (body.description !== undefined) {
      exam.description = String(body.description).trim() || null;
    }

    if (body.classId !== undefined) {
      const classId = toOptionalClassId(body.classId);
      await ensureClassExists(classId);
      exam.classId = classId;
    }

    if (body.subjectId !== undefined) {
      const subjectId =
        body.subjectId === null || body.subjectId === ""
          ? null
          : toOptionalPositiveInteger(body.subjectId, "subjectId");
      await ensureSubjectExists(subjectId);
      exam.subjectId = subjectId;
    }

    if (body.scheduleId !== undefined) {
      const scheduleId =
        body.scheduleId === null || body.scheduleId === ""
          ? null
          : toOptionalPositiveInteger(body.scheduleId, "scheduleId");

      if (scheduleId) {
        const schedule = await ExamSchedule.findByPk(scheduleId);

        if (
          !schedule ||
          Number(schedule.get("schoolId")) !== Number(exam.schoolId)
        ) {
          return res.status(404).json({ message: "Exam schedule not found" });
        }
      }

      exam.scheduleId = scheduleId;
    }

    const examDate = resolveExamDate(body);

    if (examDate !== undefined) {
      exam.date = examDate;
    }

    if (body.startTime !== undefined) {
      exam.startTime = String(body.startTime).trim() || null;
    }

    if (body.endTime !== undefined) {
      exam.endTime = String(body.endTime).trim() || null;
    }

    if (body.durationMinutes !== undefined) {
      exam.durationMinutes = Number(body.durationMinutes) || null;
    }

    if (body.totalMarks !== undefined) {
      exam.totalMarks = Number(body.totalMarks) || null;
    }

    if (body.passingMarks !== undefined) {
      exam.passingMarks = Number(body.passingMarks) || null;
    }

    if (body.status !== undefined) {
      exam.status = normalizeExamStatus(body.status);
    }

    if (body.sortOrder !== undefined) {
      exam.sortOrder = Number(body.sortOrder) || 0;
    }

    await exam.save();

    const updatedExam = await Exam.findByPk(exam.id, {
      include: examInclude,
    });

    res.json({
      message: "Exam updated successfully",
      exam: updatedExam,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteExam = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    ensureManageAccess(req);
    const exam: any = await Exam.findByPk(String(req.params.id));

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    await ensureResourceAccess(req, exam);
    await exam.destroy();

    res.json({ message: "Exam deleted successfully" });
  } catch (err) {
    next(err);
  }
};

export const getExamMarks = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const actor = getActor(req);
    const exam: any = await Exam.findByPk(String(req.params.id));

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    await ensureResourceAccess(req, exam);

    const { page, limit, offset } = getPagination(req);
    const where: Record<string, unknown> = {
      examId: exam.id,
    };

    if (actor.role === "student") {
      const studentId = await getStudentId(actor.userId);

      if (!studentId) {
        throw new AppError("Student profile not found", 400);
      }

      where.studentId = studentId;
    }

    const search = String(req.query.search ?? "").trim();

    if (search && actor.canManage) {
      const searchLike = `%${search}%`;
      const matchingStudents = await Student.findAll({
        attributes: ["id"],
        include: [
          {
            model: User,
            attributes: [],
            where: {
              [Op.or]: [
                { name: { [Op.like]: searchLike } },
                { email: { [Op.like]: searchLike } },
              ],
            },
            required: false,
          },
        ],
        where: {
          [Op.or]: [
            { rollNumber: { [Op.like]: searchLike } },
            { "$User.name$": { [Op.like]: searchLike } },
            { "$User.email$": { [Op.like]: searchLike } },
          ],
        },
        subQuery: false,
      });

      const studentIds = matchingStudents.map((student) => student.id);

      if (studentIds.length === 0) {
        return res.json({
          marks: [],
          pagination: buildPagination(page, limit, 0),
        });
      }

      where.studentId = {
        [Op.in]: studentIds,
      };
    }

    const { rows: marks, count } = await Mark.findAndCountAll({
      where,
      include: markInclude,
      order: [["id", "DESC"]],
      distinct: true,
      subQuery: false,
      limit,
      offset,
    });

    res.json({
      marks,
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};

export const upsertExamMarks = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const actor = ensureManageAccess(req);
    const exam: any = await Exam.findByPk(String(req.params.id));

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    await ensureResourceAccess(req, exam);

    const body = (req.body ?? {}) as Record<string, unknown>;
    const entries = Array.isArray(body.marks) ? body.marks : null;

    if (!entries || entries.length === 0) {
      return res.status(400).json({
        message: "marks array is required with at least one entry",
      });
    }

    const savedMarks = [];

    for (const entry of entries) {
      const row = (entry ?? {}) as Record<string, unknown>;
      const studentId = toOptionalPositiveInteger(row.studentId, "studentId");

      if (!studentId) {
        return res.status(400).json({ message: "studentId is required" });
      }

      const student = await Student.findByPk(studentId, {
        include: [{ model: User, attributes: ["id", "schoolId"] }],
      });

      if (!student) {
        return res.status(404).json({ message: `Student ${studentId} not found` });
      }

      const studentUser: any = student.get("User");

      if (
        studentUser &&
        Number(studentUser.schoolId) !== actor.schoolId
      ) {
        return res.status(403).json({
          message: `Student ${studentId} does not belong to your school`,
        });
      }

      if (exam.classId && Number(student.get("classId")) !== Number(exam.classId)) {
        return res.status(400).json({
          message: `Student ${studentId} is not in the exam class`,
        });
      }

      const marksValue = Number(row.marks);

      if (!Number.isFinite(marksValue)) {
        return res.status(400).json({
          message: `marks must be a number for student ${studentId}`,
        });
      }

      const existingMark = await Mark.findOne({
        where: {
          examId: exam.id,
          studentId,
        },
      });

      const payload = {
        examId: exam.id,
        studentId,
        marks: marksValue,
        grade:
          row.grade !== undefined ? String(row.grade).trim() || null : null,
        remarks:
          row.remarks !== undefined
            ? String(row.remarks).trim() || null
            : null,
      };

      if (existingMark) {
        await existingMark.update(payload);
        savedMarks.push(existingMark);
      } else {
        const createdMark = await Mark.create(payload);
        savedMarks.push(createdMark);
      }
    }

    const markIds = savedMarks.map((item: any) => item.id);
    const refreshedMarks = await Mark.findAll({
      where: { id: { [Op.in]: markIds } },
      include: markInclude,
      order: [["id", "ASC"]],
    });

    res.status(201).json({
      message: "Exam marks saved successfully",
      marks: refreshedMarks,
    });
  } catch (err) {
    next(err);
  }
};
