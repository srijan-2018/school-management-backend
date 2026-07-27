import { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import Timetable from "../models/timetable.model";
import Subject from "../models/subject.model";
import Teacher from "../models/teacher.model";
import Section from "../models/section.model";
import Class from "../models/class.model";
import User from "../models/user.model";
import { AppError } from "../middlewares/error.middleware";
import { buildPagination, getPagination } from "../utils/pagination";

type TimetableSlot = {
  teacherId: number;
  day: string;
  startTime: string;
  endTime: string;
  classId?: number;
};

const normalizeSectionId = (value: unknown) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const sectionId = Number(value);

  if (!Number.isInteger(sectionId) || sectionId <= 0) {
    throw new AppError("sectionId must be a positive integer", 400);
  }

  return sectionId;
};

const normalizeTimetablePayload = (payload: Record<string, unknown>) => {
  const normalizedSectionId = normalizeSectionId(payload.sectionId);

  if (normalizedSectionId === undefined) {
    return payload;
  }

  return {
    ...payload,
    sectionId: normalizedSectionId,
  };
};

const getTeacherId = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const teacherId = Number(value);

  if (!Number.isInteger(teacherId) || teacherId <= 0) {
    throw new AppError("teacherId must be a positive integer", 400);
  }

  return teacherId;
};

const parseTimeToMinutes = (time: string) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());

  if (!match) {
    throw new AppError(`Invalid time format: ${time}. Use HH:MM`, 400);
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    throw new AppError(`Invalid time value: ${time}`, 400);
  }

  return hours * 60 + minutes;
};

const assertValidTimeRange = (startTime: string, endTime: string) => {
  if (parseTimeToMinutes(startTime) >= parseTimeToMinutes(endTime)) {
    throw new AppError("startTime must be earlier than endTime", 400);
  }
};

const timesOverlap = (
  startA: string,
  endA: string,
  startB: string,
  endB: string,
) => {
  const aStart = parseTimeToMinutes(startA);
  const aEnd = parseTimeToMinutes(endA);
  const bStart = parseTimeToMinutes(startB);
  const bEnd = parseTimeToMinutes(endB);

  return aStart < bEnd && bStart < aEnd;
};

const normalizeDay = (day: string) => day.trim().toLowerCase();

const buildTeacherConflictMessage = (
  className: string,
  day: string,
  startTime: string,
  endTime: string,
) =>
  `This teacher is already engaged in ${className} on ${day} from ${startTime} to ${endTime} and cannot be assigned to another class at the same time.`;

const assertNoTeacherScheduleConflict = async (
  slot: TimetableSlot,
  options?: {
    excludeId?: number;
    pendingSlots?: TimetableSlot[];
  },
) => {
  assertValidTimeRange(slot.startTime, slot.endTime);

  const slotDay = normalizeDay(slot.day);

  for (const pending of options?.pendingSlots ?? []) {
    if (
      pending.teacherId === slot.teacherId &&
      normalizeDay(pending.day) === slotDay &&
      timesOverlap(
        slot.startTime,
        slot.endTime,
        pending.startTime,
        pending.endTime,
      )
    ) {
      throw new AppError(
        buildTeacherConflictMessage(
          pending.classId ? `class ${pending.classId}` : "another class",
          pending.day,
          pending.startTime,
          pending.endTime,
        ),
        409,
      );
    }
  }

  const existing = await Timetable.findAll({
    where: {
      teacherId: slot.teacherId,
      ...(options?.excludeId ? { id: { [Op.ne]: options.excludeId } } : {}),
    },
    include: [{ model: Class, attributes: ["name"], required: false }],
  });

  for (const entry of existing) {
    if (normalizeDay(entry.day) !== slotDay) {
      continue;
    }

    if (
      timesOverlap(
        slot.startTime,
        slot.endTime,
        entry.startTime,
        entry.endTime,
      )
    ) {
      const className = entry.Class?.name ?? `class ${entry.classId}`;
      throw new AppError(
        buildTeacherConflictMessage(
          className,
          entry.day,
          entry.startTime,
          entry.endTime,
        ),
        409,
      );
    }
  }
};

const validateTeacherSchedule = async (
  payload: Record<string, unknown>,
  options?: {
    excludeId?: number;
    pendingSlots?: TimetableSlot[];
  },
) => {
  const teacherId = getTeacherId(payload.teacherId);

  if (!teacherId) {
    return;
  }

  const { day, startTime, endTime } = payload;

  if (!day || !startTime || !endTime) {
    return;
  }

  await assertNoTeacherScheduleConflict(
    {
      teacherId,
      day: String(day),
      startTime: String(startTime),
      endTime: String(endTime),
      classId:
        payload.classId !== undefined ? Number(payload.classId) : undefined,
    },
    options,
  );
};

export const createTimetable = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (Array.isArray(req.body)) {
      if (req.body.length === 0) {
        return res
          .status(400)
          .json({ message: "timetables payload cannot be empty" });
      }

      const payloads = req.body.map((payload) =>
        normalizeTimetablePayload((payload ?? {}) as Record<string, unknown>),
      );
      const pendingSlots: TimetableSlot[] = [];

      for (const payload of payloads) {
        await validateTeacherSchedule(payload, { pendingSlots });

        const teacherId = getTeacherId(payload.teacherId);
        if (teacherId && payload.day && payload.startTime && payload.endTime) {
          pendingSlots.push({
            teacherId,
            day: String(payload.day),
            startTime: String(payload.startTime),
            endTime: String(payload.endTime),
            classId:
              payload.classId !== undefined
                ? Number(payload.classId)
                : undefined,
          });
        }
      }

      const timetables = await Timetable.bulkCreate(payloads, {
        validate: true,
      });

      return res.status(201).json({
        message: "timetables created successfully",
        timetables,
      });
    }

    const payload = normalizeTimetablePayload(
      (req.body ?? {}) as Record<string, unknown>,
    );

    await validateTeacherSchedule(payload);

    const timetable = await Timetable.create(payload);

    res.status(201).json({
      message: "timetable created successfully",
      timetable,
    });
  } catch (err) {
    next(err);
  }
};

export const updateTimetable = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const timetable: any = await Timetable.findByPk(String(req.params.id));

    if (!timetable) {
      return res.status(404).json({ message: "timetable not found" });
    }

    const payload = normalizeTimetablePayload(
      (req.body ?? {}) as Record<string, unknown>,
    );

    await validateTeacherSchedule(
      {
        teacherId: payload.teacherId ?? timetable.teacherId,
        day: payload.day ?? timetable.day,
        startTime: payload.startTime ?? timetable.startTime,
        endTime: payload.endTime ?? timetable.endTime,
        classId: payload.classId ?? timetable.classId,
      },
      { excludeId: timetable.id },
    );

    await timetable.update(payload);

    res.json({
      message: "timetable updated successfully",
      timetable,
    });
  } catch (err) {
    next(err);
  }
};

export const getTimetableByClass = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const classId = Number(req.params.id);
    if (!Number.isInteger(classId) || classId <= 0) {
      throw new AppError("classId must be a positive integer", 400);
    }

    // Fetch timetable entries with associations
    const { rows, count } = await Timetable.findAndCountAll({
      where: { classId },
      limit,
      offset,
      order: [["id", "DESC"]],
      include: [
        { model: Subject, attributes: ["name"], required: false },
        {
          model: Teacher,
          attributes: ["id", "userId"],
          required: false,
          include: [{ model: User, attributes: ["name"], required: false }],
        },
        { model: Section, attributes: ["name"], required: false },
        { model: Class, attributes: ["name"], required: false },
      ],
    });

    // Map results to include names
    const timetable = rows.map((entry: any) => ({
      id: entry.id,
      classId: entry.classId,
      sectionId: entry.sectionId,
      subjectId: entry.subjectId,
      teacherId: entry.teacherId,
      day: entry.day,
      startTime: entry.startTime,
      endTime: entry.endTime,
      room: entry.room,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      subjectName: entry.Subject?.name ?? null,
      teacherName: entry.Teacher?.User?.name ?? null,
      sectionName: entry.Section?.name ?? null,
      className: entry.Class?.name ?? null,
    }));

    res.json({
      timetable,
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};
