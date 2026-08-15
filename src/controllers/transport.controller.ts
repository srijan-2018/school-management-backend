import { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";

import TransportVehicle from "../models/transport-vehicle.model";
import TransportRoute from "../models/transport-route.model";
import TransportAssignment from "../models/transport-assignment.model";
import TransportTrip from "../models/transport-trip.model";
import TransportTripStudent from "../models/transport-trip-student.model";
import TransportTripLocation from "../models/transport-trip-location.model";
import Student from "../models/student.model";
import User from "../models/user.model";
import Parent from "../models/parent.model";
import { requireSchoolId } from "../helpers/school-scope";
import { buildPagination, getPagination } from "../utils/pagination";
import { AppError } from "../middlewares/error.middleware";
import { normalizeRole, OWNER_LEVEL_ROLES } from "../utils/roles";

function getAuthUser(req: Request) {
  const raw = (req as any).user;
  const id = Number(raw?.id);
  const role = normalizeRole(raw?.role);
  if (!Number.isFinite(id) || !role) {
    throw new AppError("Unauthorized", 401);
  }
  return { id, role, schoolId: raw?.schoolId ?? null };
}

function toOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toRequiredNumber(value: unknown, field: string) {
  const numeric = toOptionalNumber(value);
  if (numeric === null) {
    throw new AppError(`${field} is required`, 400);
  }
  return numeric;
}

function isOwnerLevel(role: string) {
  return OWNER_LEVEL_ROLES.includes(role as any);
}

async function getParentLinkedStudentIds(userId: number) {
  const parent: any = await Parent.findOne({
    where: { userId },
    include: [
      {
        model: Student,
        attributes: ["id"],
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

  return students
    .map((student: any) => Number(student.id ?? student.get?.("id")))
    .filter((id: number) => Number.isInteger(id) && id > 0);
}

const tripInclude = [
  {
    model: TransportVehicle,
    as: "vehicle",
    attributes: ["id", "plateNumber", "capacity", "driverName", "driverPhone", "status", "driverUserId"],
  },
  {
    model: TransportRoute,
    as: "route",
    attributes: ["id", "name", "stops", "fare", "status"],
  },
  {
    model: User,
    as: "driver",
    attributes: ["id", "name", "email", "role"],
  },
  {
    model: TransportTripStudent,
    as: "students",
    include: [
      {
        model: Student,
        as: "student",
        include: [
          {
            model: User,
            attributes: ["id", "name", "email"],
          },
        ],
      },
    ],
  },
];

function serializeTripStudent(row: any) {
  const student = row.student;
  const user = student?.User ?? student?.user ?? null;
  return {
    id: row.id,
    tripId: row.tripId,
    studentId: row.studentId,
    assignmentId: row.assignmentId,
    stopName: row.stopName,
    status: row.status,
    boardedAt: row.boardedAt,
    droppedAt: row.droppedAt,
    boardedLat: row.boardedLat,
    boardedLng: row.boardedLng,
    droppedLat: row.droppedLat,
    droppedLng: row.droppedLng,
    notes: row.notes,
    student: student
      ? {
          id: student.id,
          rollNumber: student.rollNumber,
          classId: student.classId,
          sectionId: student.sectionId,
          name: user?.name ?? null,
          email: user?.email ?? null,
        }
      : null,
  };
}

function serializeTrip(trip: any) {
  const plain = typeof trip.toJSON === "function" ? trip.toJSON() : trip;
  return {
    ...plain,
    students: Array.isArray(plain.students)
      ? plain.students.map(serializeTripStudent)
      : [],
    checklistSummary: summarizeChecklist(plain.students ?? []),
  };
}

function summarizeChecklist(students: any[]) {
  const summary = {
    total: students.length,
    expected: 0,
    boarded: 0,
    dropped: 0,
    absent: 0,
  };

  students.forEach((student) => {
    const status = String(student.status ?? "expected");
    if (status in summary) {
      (summary as any)[status] += 1;
    }
  });

  return summary;
}

async function assertCanAccessTrip(req: Request, trip: any) {
  const user = getAuthUser(req);

  if (
    isOwnerLevel(user.role) ||
    user.role === "head_teacher" ||
    user.role === "teacher" ||
    user.role === "staff"
  ) {
    return;
  }

  if (user.role === "driver") {
    if (Number(trip.driverUserId) !== user.id) {
      throw new AppError("Access denied for this trip", 403);
    }
    return;
  }

  if (user.role === "parent") {
    const linked = await getParentLinkedStudentIds(user.id);
    const tripStudents = await TransportTripStudent.findAll({
      where: { tripId: trip.id },
      attributes: ["studentId"],
    });
    const hasChild = tripStudents.some((row) =>
      linked.includes(Number(row.get("studentId"))),
    );
    if (!hasChild) {
      throw new AppError("Access denied for this trip", 403);
    }
    return;
  }

  throw new AppError("Access denied", 403);
}

async function loadTripOrFail(schoolId: number, tripId: number) {
  const trip = await TransportTrip.findOne({
    where: { id: tripId, schoolId },
    include: tripInclude,
  });
  if (!trip) {
    throw new AppError("Trip not found", 404);
  }
  return trip;
}

export const listVehicles = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const user = getAuthUser(req);
    const { page, limit, offset } = getPagination(req);

    const where: Record<string, unknown> = { schoolId };
    if (user.role === "driver") {
      where.driverUserId = user.id;
    }

    const { rows, count } = await TransportVehicle.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "driverUser",
          attributes: ["id", "name", "email", "role"],
          required: false,
        },
      ],
      order: [["id", "DESC"]],
      limit,
      offset,
    });

    res.json({
      vehicles: rows,
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};

export const createVehicle = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const user = getAuthUser(req);
    if (user.role === "driver") {
      throw new AppError("Drivers cannot create vehicles", 403);
    }

    const payload = { ...(req.body ?? {}), schoolId };
    const driverUserId = toOptionalNumber(payload.driverUserId);
    if (driverUserId) {
      const driver = await User.findOne({
        where: { id: driverUserId, schoolId, role: "driver" },
      });
      if (!driver) {
        throw new AppError("driverUserId must be a driver in this school", 400);
      }
      payload.driverName = payload.driverName || driver.get("name");
    }

    const vehicle = await TransportVehicle.create(payload);
    res.status(201).json({ message: "vehicle created", vehicle });
  } catch (err) {
    next(err);
  }
};

export const updateVehicle = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const user = getAuthUser(req);
    if (user.role === "driver") {
      throw new AppError("Drivers cannot update vehicles", 403);
    }

    const vehicle: any = await TransportVehicle.findOne({
      where: { id: req.params.id, schoolId },
    });
    if (!vehicle) {
      return res.status(404).json({ message: "vehicle not found" });
    }

    const payload = { ...(req.body ?? {}) };
    delete payload.schoolId;

    if (payload.driverUserId !== undefined) {
      const driverUserId = toOptionalNumber(payload.driverUserId);
      payload.driverUserId = driverUserId;
      if (driverUserId) {
        const driver = await User.findOne({
          where: { id: driverUserId, schoolId, role: "driver" },
        });
        if (!driver) {
          throw new AppError(
            "driverUserId must be a driver in this school",
            400,
          );
        }
        if (!payload.driverName) {
          payload.driverName = driver.get("name");
        }
      }
    }

    await vehicle.update(payload);
    res.json({ message: "vehicle updated", vehicle });
  } catch (err) {
    next(err);
  }
};

export const deleteVehicle = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const vehicle = await TransportVehicle.findOne({
      where: { id: req.params.id, schoolId },
    });
    if (!vehicle) {
      return res.status(404).json({ message: "vehicle not found" });
    }
    await vehicle.destroy();
    res.json({ message: "vehicle deleted" });
  } catch (err) {
    next(err);
  }
};

export const listDrivers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const drivers = await User.findAll({
      where: { schoolId, role: "driver" },
      attributes: ["id", "name", "email", "role"],
      order: [["name", "ASC"]],
    });

    res.json({ drivers });
  } catch (err) {
    next(err);
  }
};

export const listRoutes = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const user = getAuthUser(req);
    const { page, limit, offset } = getPagination(req);

    let where: any = { schoolId };
    if (user.role === "driver") {
      const vehicles = await TransportVehicle.findAll({
        where: { schoolId, driverUserId: user.id },
        attributes: ["id"],
      });
      const vehicleIds = vehicles.map((row) => Number(row.get("id")));
      where = {
        schoolId,
        [Op.or]: [
          { vehicleId: { [Op.in]: vehicleIds.length ? vehicleIds : [-1] } },
        ],
      };
    }

    const { rows, count } = await TransportRoute.findAndCountAll({
      where,
      include: [
        {
          model: TransportVehicle,
          as: "vehicle",
          attributes: ["id", "plateNumber", "driverName", "driverUserId"],
          required: false,
        },
      ],
      order: [["id", "DESC"]],
      limit,
      offset,
    });

    res.json({ routes: rows, pagination: buildPagination(page, limit, count) });
  } catch (err) {
    next(err);
  }
};

export const createRoute = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const user = getAuthUser(req);
    if (user.role === "driver") {
      throw new AppError("Drivers cannot create routes", 403);
    }

    const payload = { ...(req.body ?? {}), schoolId };
    if (payload.vehicleId != null && payload.vehicleId !== "") {
      payload.vehicleId = toRequiredNumber(payload.vehicleId, "vehicleId");
      const vehicle = await TransportVehicle.findOne({
        where: { id: payload.vehicleId, schoolId },
      });
      if (!vehicle) {
        throw new AppError("Vehicle not found", 404);
      }
    } else {
      payload.vehicleId = null;
    }

    if (typeof payload.stops === "string") {
      try {
        payload.stops = JSON.parse(payload.stops);
      } catch {
        payload.stops = payload.stops
          .split(",")
          .map((item: string) => item.trim())
          .filter(Boolean);
      }
    }

    const route = await TransportRoute.create(payload);
    res.status(201).json({ message: "route created", route });
  } catch (err) {
    next(err);
  }
};

export const updateRoute = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const user = getAuthUser(req);
    if (user.role === "driver") {
      throw new AppError("Drivers cannot update routes", 403);
    }

    const route: any = await TransportRoute.findOne({
      where: { id: req.params.id, schoolId },
    });
    if (!route) {
      return res.status(404).json({ message: "route not found" });
    }

    const payload = { ...(req.body ?? {}) };
    delete payload.schoolId;

    if (payload.vehicleId !== undefined) {
      if (payload.vehicleId === null || payload.vehicleId === "") {
        payload.vehicleId = null;
      } else {
        payload.vehicleId = toRequiredNumber(payload.vehicleId, "vehicleId");
        const vehicle = await TransportVehicle.findOne({
          where: { id: payload.vehicleId, schoolId },
        });
        if (!vehicle) {
          throw new AppError("Vehicle not found", 404);
        }
      }
    }

    if (typeof payload.stops === "string") {
      try {
        payload.stops = JSON.parse(payload.stops);
      } catch {
        payload.stops = payload.stops
          .split(",")
          .map((item: string) => item.trim())
          .filter(Boolean);
      }
    }

    await route.update(payload);
    res.json({ message: "route updated", route });
  } catch (err) {
    next(err);
  }
};

export const deleteRoute = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const route = await TransportRoute.findOne({
      where: { id: req.params.id, schoolId },
    });
    if (!route) {
      return res.status(404).json({ message: "route not found" });
    }
    await route.destroy();
    res.json({ message: "route deleted" });
  } catch (err) {
    next(err);
  }
};

export const listAssignments = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const user = getAuthUser(req);
    const { page, limit, offset } = getPagination(req);

    const where: any = { schoolId };
    const routeId = toOptionalNumber(req.query.routeId);
    const studentId = toOptionalNumber(req.query.studentId);
    if (routeId) where.routeId = routeId;
    if (studentId) where.studentId = studentId;

    if (user.role === "parent") {
      const linked = await getParentLinkedStudentIds(user.id);
      where.studentId = { [Op.in]: linked.length ? linked : [-1] };
    }

    if (user.role === "driver") {
      const vehicles = await TransportVehicle.findAll({
        where: { schoolId, driverUserId: user.id },
        attributes: ["id"],
      });
      const vehicleIds = vehicles.map((row) => Number(row.get("id")));
      const routes = await TransportRoute.findAll({
        where: {
          schoolId,
          vehicleId: { [Op.in]: vehicleIds.length ? vehicleIds : [-1] },
        },
        attributes: ["id"],
      });
      where.routeId = {
        [Op.in]: routes.map((row) => Number(row.get("id"))),
      };
    }

    const { rows, count } = await TransportAssignment.findAndCountAll({
      where,
      include: [
        {
          model: Student,
          as: "student",
          include: [{ model: User, attributes: ["id", "name", "email"] }],
        },
        {
          model: TransportRoute,
          as: "route",
          include: [
            {
              model: TransportVehicle,
              as: "vehicle",
              attributes: ["id", "plateNumber", "driverName", "driverUserId"],
            },
          ],
        },
      ],
      order: [["id", "DESC"]],
      limit,
      offset,
    });

    const assignments = rows.map((row: any) => {
      const plain = row.toJSON();
      const userRow = plain.student?.User ?? plain.student?.user;
      return {
        ...plain,
        studentName: userRow?.name ?? null,
        studentEmail: userRow?.email ?? null,
        routeName: plain.route?.name ?? null,
        vehicleId: plain.route?.vehicleId ?? null,
        plateNumber: plain.route?.vehicle?.plateNumber ?? null,
      };
    });

    res.json({
      assignments,
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};

export const createAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const user = getAuthUser(req);
    if (user.role === "driver") {
      throw new AppError("Drivers cannot map students to buses", 403);
    }

    const studentId = toRequiredNumber(req.body?.studentId, "studentId");
    const routeId = toRequiredNumber(req.body?.routeId, "routeId");

    let student: any = await Student.findOne({
      where: { id: studentId },
      include: [
        {
          model: User,
          where: { schoolId, role: "student" },
          required: true,
          attributes: ["id", "schoolId"],
        },
      ],
    });
    if (!student) {
      const studentUser: any = await User.findOne({
        where: { id: studentId, schoolId, role: "student" },
        include: [{ model: Student, as: "student" }],
      });
      student = studentUser?.student ?? null;
    }
    if (!student) {
      throw new AppError("Student not found in this school", 404);
    }

    const resolvedStudentId = Number(student.id);
    const route = await TransportRoute.findOne({ where: { id: routeId, schoolId } });
    if (!route) {
      throw new AppError("Route not found in this school", 404);
    }

    const existing = await TransportAssignment.findOne({
      where: { schoolId, studentId: resolvedStudentId },
    });
    if (existing) {
      throw new AppError("Student is already mapped to a transport route", 409);
    }

    const assignment = await TransportAssignment.create({
      schoolId,
      studentId: resolvedStudentId,
      routeId,
      stopName: req.body?.stopName ?? null,
      pickupTime: req.body?.pickupTime ?? null,
      sortOrder: Number.isInteger(Number(req.body?.sortOrder))
        ? Number(req.body.sortOrder)
        : 0,
    });

    res.status(201).json({ message: "assignment created", assignment });
  } catch (err) {
    next(err);
  }
};

export const updateAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const user = getAuthUser(req);
    if (user.role === "driver") {
      throw new AppError("Drivers cannot update assignments", 403);
    }

    const assignment: any = await TransportAssignment.findOne({
      where: { id: req.params.id, schoolId },
    });
    if (!assignment) {
      return res.status(404).json({ message: "assignment not found" });
    }

    const payload = { ...(req.body ?? {}) };
    delete payload.schoolId;

    if (payload.studentId != null) {
      payload.studentId = toRequiredNumber(payload.studentId, "studentId");
      const student = await Student.findOne({
        where: { id: payload.studentId, schoolId },
      });
      if (!student) {
        throw new AppError("Student not found in this school", 404);
      }
    }

    if (payload.routeId != null) {
      payload.routeId = toRequiredNumber(payload.routeId, "routeId");
      const route = await TransportRoute.findOne({
        where: { id: payload.routeId, schoolId },
      });
      if (!route) {
        throw new AppError("Route not found in this school", 404);
      }
    }

    await assignment.update(payload);
    res.json({ message: "assignment updated", assignment });
  } catch (err) {
    next(err);
  }
};

export const deleteAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const user = getAuthUser(req);
    if (user.role === "driver") {
      throw new AppError("Drivers cannot delete assignments", 403);
    }

    const assignment = await TransportAssignment.findOne({
      where: { id: req.params.id, schoolId },
    });
    if (!assignment) {
      return res.status(404).json({ message: "assignment not found" });
    }
    await assignment.destroy();
    res.json({ message: "assignment deleted" });
  } catch (err) {
    next(err);
  }
};

export const listTrips = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const user = getAuthUser(req);
    const { page, limit, offset } = getPagination(req);
    const status = typeof req.query.status === "string" ? req.query.status : null;

    const where: any = { schoolId };
    if (status) where.status = status;

    if (user.role === "driver") {
      where.driverUserId = user.id;
    }

    if (user.role === "parent") {
      const linked = await getParentLinkedStudentIds(user.id);
      const tripRows = await TransportTripStudent.findAll({
        where: { studentId: { [Op.in]: linked.length ? linked : [-1] } },
        attributes: ["tripId"],
      });
      where.id = {
        [Op.in]: [
          ...new Set(tripRows.map((row) => Number(row.get("tripId")))),
        ],
      };
    }

    const { rows, count } = await TransportTrip.findAndCountAll({
      where,
      include: tripInclude,
      order: [["id", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    res.json({
      trips: rows.map(serializeTrip),
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};

export const listActiveTrips = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const user = getAuthUser(req);

    const where: any = {
      schoolId,
      status: "in_progress",
    };

    if (user.role === "driver") {
      where.driverUserId = user.id;
    }

    if (user.role === "parent") {
      const linked = await getParentLinkedStudentIds(user.id);
      const tripRows = await TransportTripStudent.findAll({
        where: { studentId: { [Op.in]: linked.length ? linked : [-1] } },
        attributes: ["tripId"],
      });
      where.id = {
        [Op.in]: [
          ...new Set(tripRows.map((row) => Number(row.get("tripId")))),
        ],
      };
    }

    const trips = await TransportTrip.findAll({
      where,
      include: tripInclude,
      order: [["startedAt", "DESC"]],
    });

    res.json({ trips: trips.map(serializeTrip) });
  } catch (err) {
    next(err);
  }
};

export const getTrip = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const trip = await loadTripOrFail(schoolId, Number(req.params.id));
    await assertCanAccessTrip(req, trip);

    const locations = await TransportTripLocation.findAll({
      where: { tripId: trip.get("id") },
      order: [["recordedAt", "ASC"]],
      limit: 500,
    });

    res.json({
      trip: serializeTrip(trip),
      locations,
    });
  } catch (err) {
    next(err);
  }
};

export const startTrip = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const user = getAuthUser(req);

    const direction =
      req.body?.direction === "dropoff" ? "dropoff" : "pickup";
    const startLat = toOptionalNumber(req.body?.startLat);
    const startLng = toOptionalNumber(req.body?.startLng);
    const endLat = toOptionalNumber(req.body?.endLat);
    const endLng = toOptionalNumber(req.body?.endLng);
    const endAddress =
      typeof req.body?.endAddress === "string" ? req.body.endAddress : null;

    if (startLat == null || startLng == null) {
      throw new AppError("startLat and startLng are required", 400);
    }

    let driverUserId = user.id;
    if (isOwnerLevel(user.role) && req.body?.driverUserId != null) {
      driverUserId = toRequiredNumber(req.body.driverUserId, "driverUserId");
    } else if (user.role !== "driver" && !isOwnerLevel(user.role)) {
      throw new AppError("Only drivers can start trips", 403);
    }

    let vehicle: any = null;
    const vehicleId = toOptionalNumber(req.body?.vehicleId);
    const routeId = toOptionalNumber(req.body?.routeId);

    if (vehicleId) {
      vehicle = await TransportVehicle.findOne({
        where: { id: vehicleId, schoolId },
      });
    } else {
      vehicle = await TransportVehicle.findOne({
        where: { schoolId, driverUserId, status: "active" },
      });
    }

    if (!vehicle) {
      throw new AppError(
        "No vehicle found for this driver. Map a driver to a bus first.",
        400,
      );
    }

    if (
      user.role === "driver" &&
      Number(vehicle.driverUserId) !== user.id
    ) {
      throw new AppError("You are not assigned to this vehicle", 403);
    }

    let route: any = null;
    if (routeId) {
      route = await TransportRoute.findOne({
        where: { id: routeId, schoolId },
      });
      if (!route) {
        throw new AppError("Route not found", 404);
      }
    } else {
      route = await TransportRoute.findOne({
        where: {
          schoolId,
          vehicleId: vehicle.id,
          status: "active",
        },
      });
    }

    const activeTrip = await TransportTrip.findOne({
      where: {
        schoolId,
        driverUserId,
        status: "in_progress",
      },
    });
    if (activeTrip) {
      throw new AppError(
        "You already have an active trip. Complete it before starting another.",
        409,
      );
    }

    const now = new Date();
    const trip = await TransportTrip.create({
      schoolId,
      routeId: route?.id ?? null,
      vehicleId: vehicle.id,
      driverUserId,
      direction,
      status: "in_progress",
      startLat,
      startLng,
      endLat,
      endLng,
      endAddress,
      currentLat: startLat,
      currentLng: startLng,
      locationText:
        typeof req.body?.locationText === "string"
          ? req.body.locationText.trim() || null
          : null,
      locationUpdatedAt: now,
      startedAt: now,
      notes: typeof req.body?.notes === "string" ? req.body.notes : null,
    });

    await TransportTripLocation.create({
      tripId: trip.id,
      lat: startLat,
      lng: startLng,
      recordedAt: now,
    });

    const assignmentWhere: any = { schoolId };
    if (route?.id) {
      assignmentWhere.routeId = route.id;
    } else {
      const routeIds = (
        await TransportRoute.findAll({
          where: { schoolId, vehicleId: vehicle.id },
          attributes: ["id"],
        })
      ).map((row) => Number(row.get("id")));
      assignmentWhere.routeId = { [Op.in]: routeIds.length ? routeIds : [-1] };
    }

    const assignments = await TransportAssignment.findAll({
      where: assignmentWhere,
      order: [["sortOrder", "ASC"], ["id", "ASC"]],
    });

    if (assignments.length) {
      await TransportTripStudent.bulkCreate(
        assignments.map((assignment: any) => ({
          tripId: trip.id,
          studentId: assignment.studentId,
          assignmentId: assignment.id,
          stopName: assignment.stopName,
          status: "expected",
        })),
      );
    }

    const fullTrip = await loadTripOrFail(schoolId, trip.id);
    res.status(201).json({
      message: "Trip started",
      trip: serializeTrip(fullTrip),
    });
  } catch (err) {
    next(err);
  }
};

export const updateTripLocation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const user = getAuthUser(req);
    const trip: any = await TransportTrip.findOne({
      where: { id: req.params.id, schoolId },
    });
    if (!trip) {
      throw new AppError("Trip not found", 404);
    }
    if (trip.status !== "in_progress") {
      throw new AppError("Trip is not in progress", 400);
    }

    if (
      user.role === "driver" &&
      Number(trip.driverUserId) !== user.id
    ) {
      throw new AppError("Access denied", 403);
    }
    if (
      user.role !== "driver" &&
      !isOwnerLevel(user.role)
    ) {
      throw new AppError("Access denied", 403);
    }

    const lat = toRequiredNumber(req.body?.lat, "lat");
    const lng = toRequiredNumber(req.body?.lng, "lng");
    const now = new Date();

    await TransportTripLocation.create({
      tripId: trip.id,
      lat,
      lng,
      speed: toOptionalNumber(req.body?.speed),
      heading: toOptionalNumber(req.body?.heading),
      accuracy: toOptionalNumber(req.body?.accuracy),
      recordedAt: now,
    });

    await trip.update({
      currentLat: lat,
      currentLng: lng,
      locationText:
        typeof req.body?.locationText === "string"
          ? req.body.locationText.trim() || null
          : trip.locationText,
      locationUpdatedAt: now,
    });

    res.json({
      message: "Location updated",
      location: {
        lat,
        lng,
        recordedAt: now,
      },
      trip: {
        id: trip.id,
        currentLat: lat,
        currentLng: lng,
        locationText: trip.locationText,
        locationUpdatedAt: now,
        status: trip.status,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const markStudentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const user = getAuthUser(req);
    const action = String(req.params.action || "").toLowerCase();
    if (!["board", "drop", "absent"].includes(action)) {
      throw new AppError("Invalid action", 400);
    }

    const trip: any = await TransportTrip.findOne({
      where: { id: req.params.id, schoolId },
    });
    if (!trip) {
      throw new AppError("Trip not found", 404);
    }
    if (trip.status !== "in_progress") {
      throw new AppError("Trip is not in progress", 400);
    }

    if (
      user.role === "driver" &&
      Number(trip.driverUserId) !== user.id
    ) {
      throw new AppError("Access denied", 403);
    }
    if (
      user.role !== "driver" &&
      !isOwnerLevel(user.role) &&
      user.role !== "head_teacher"
    ) {
      throw new AppError("Access denied", 403);
    }

    const studentId = toRequiredNumber(req.params.studentId, "studentId");
    let tripStudent: any = await TransportTripStudent.findOne({
      where: { tripId: trip.id, studentId },
    });

    if (!tripStudent) {
      tripStudent = await TransportTripStudent.create({
        tripId: trip.id,
        studentId,
        status: "expected",
      });
    }

    const lat = toOptionalNumber(req.body?.lat);
    const lng = toOptionalNumber(req.body?.lng);
    const now = new Date();

    if (action === "board") {
      await tripStudent.update({
        status: "boarded",
        boardedAt: now,
        boardedLat: lat,
        boardedLng: lng,
        notes: req.body?.notes ?? tripStudent.notes,
      });
    } else if (action === "drop") {
      if (tripStudent.status !== "boarded" && tripStudent.status !== "dropped") {
        throw new AppError("Student must be boarded before drop-off", 400);
      }
      await tripStudent.update({
        status: "dropped",
        droppedAt: now,
        droppedLat: lat,
        droppedLng: lng,
        notes: req.body?.notes ?? tripStudent.notes,
      });
    } else {
      await tripStudent.update({
        status: "absent",
        notes: req.body?.notes ?? tripStudent.notes,
      });
    }

    const fullTrip = await loadTripOrFail(schoolId, trip.id);
    res.json({
      message: `Student marked as ${action === "board" ? "boarded" : action === "drop" ? "dropped" : "absent"}`,
      trip: serializeTrip(fullTrip),
    });
  } catch (err) {
    next(err);
  }
};

export const completeTrip = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const user = getAuthUser(req);
    const trip: any = await TransportTrip.findOne({
      where: { id: req.params.id, schoolId },
    });
    if (!trip) {
      throw new AppError("Trip not found", 404);
    }
    if (trip.status !== "in_progress") {
      throw new AppError("Trip is not in progress", 400);
    }

    if (
      user.role === "driver" &&
      Number(trip.driverUserId) !== user.id
    ) {
      throw new AppError("Access denied", 403);
    }
    if (user.role !== "driver" && !isOwnerLevel(user.role)) {
      throw new AppError("Access denied", 403);
    }

    const endLat = toOptionalNumber(req.body?.endLat) ?? trip.currentLat;
    const endLng = toOptionalNumber(req.body?.endLng) ?? trip.currentLng;
    const now = new Date();

    if (endLat != null && endLng != null) {
      await TransportTripLocation.create({
        tripId: trip.id,
        lat: endLat,
        lng: endLng,
        recordedAt: now,
      });
    }

    await trip.update({
      status: "completed",
      completedAt: now,
      endLat,
      endLng,
      endAddress:
        typeof req.body?.endAddress === "string"
          ? req.body.endAddress
          : trip.endAddress,
      currentLat: endLat ?? trip.currentLat,
      currentLng: endLng ?? trip.currentLng,
      locationUpdatedAt: now,
    });

    const fullTrip = await loadTripOrFail(schoolId, trip.id);
    res.json({
      message: "Trip completed",
      trip: serializeTrip(fullTrip),
    });
  } catch (err) {
    next(err);
  }
};

export const getMyRoster = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const user = getAuthUser(req);

    let driverUserId = user.id;
    if (isOwnerLevel(user.role) && req.query.driverUserId) {
      driverUserId = toRequiredNumber(req.query.driverUserId, "driverUserId");
    } else if (user.role !== "driver" && !isOwnerLevel(user.role)) {
      throw new AppError("Access denied", 403);
    }

    const vehicle = await TransportVehicle.findOne({
      where: { schoolId, driverUserId },
      include: [
        {
          model: User,
          as: "driverUser",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    if (!vehicle) {
      return res.json({ vehicle: null, routes: [], assignments: [] });
    }

    const routes = await TransportRoute.findAll({
      where: { schoolId, vehicleId: vehicle.get("id") },
    });
    const routeIds = routes.map((row) => Number(row.get("id")));

    const assignments = await TransportAssignment.findAll({
      where: {
        schoolId,
        routeId: { [Op.in]: routeIds.length ? routeIds : [-1] },
      },
      include: [
        {
          model: Student,
          as: "student",
          include: [{ model: User, attributes: ["id", "name", "email"] }],
        },
        { model: TransportRoute, as: "route" },
      ],
      order: [["sortOrder", "ASC"], ["stopName", "ASC"]],
    });

    res.json({
      vehicle,
      routes,
      assignments: assignments.map((row: any) => {
        const plain = row.toJSON();
        const userRow = plain.student?.User ?? plain.student?.user;
        return {
          ...plain,
          studentName: userRow?.name ?? null,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
};
