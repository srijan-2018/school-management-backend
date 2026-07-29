import { NextFunction, Request, Response } from "express";
import HostelBuilding from "../models/hostel-building.model";
import HostelRoom from "../models/hostel-room.model";
import HostelAllocation from "../models/hostel-allocation.model";
import { requireSchoolId } from "../helpers/school-scope";
import { buildPagination, getPagination } from "../utils/pagination";

export const listBuildings = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const { page, limit, offset } = getPagination(req);
    const { rows, count } = await HostelBuilding.findAndCountAll({
      where: { schoolId },
      order: [["id", "DESC"]],
      limit,
      offset,
    });
    res.json({ buildings: rows, pagination: buildPagination(page, limit, count) });
  } catch (err) {
    next(err);
  }
};

export const createBuilding = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const building = await HostelBuilding.create({ ...(req.body ?? {}), schoolId });
    res.status(201).json({ message: "Building created", building });
  } catch (err) {
    next(err);
  }
};

export const updateBuilding = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const building: any = await HostelBuilding.findOne({
      where: { id: req.params.id, schoolId },
    });
    if (!building) return res.status(404).json({ message: "Building not found" });
    const payload = { ...(req.body ?? {}) };
    delete payload.schoolId;
    await building.update(payload);
    res.json({ message: "Building updated", building });
  } catch (err) {
    next(err);
  }
};

export const listRooms = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const { page, limit, offset } = getPagination(req);
    const where: Record<string, unknown> = { schoolId };
    if (req.query.buildingId) where.buildingId = Number(req.query.buildingId);
    const { rows, count } = await HostelRoom.findAndCountAll({
      where,
      order: [["id", "DESC"]],
      limit,
      offset,
    });
    res.json({ rooms: rows, pagination: buildPagination(page, limit, count) });
  } catch (err) {
    next(err);
  }
};

export const createRoom = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const room = await HostelRoom.create({
      ...(req.body ?? {}),
      schoolId,
      occupied: 0,
    });
    res.status(201).json({ message: "Room created", room });
  } catch (err) {
    next(err);
  }
};

export const updateRoom = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const room: any = await HostelRoom.findOne({
      where: { id: req.params.id, schoolId },
    });
    if (!room) return res.status(404).json({ message: "Room not found" });
    const payload = { ...(req.body ?? {}) };
    delete payload.schoolId;
    delete payload.occupied;
    await room.update(payload);
    res.json({ message: "Room updated", room });
  } catch (err) {
    next(err);
  }
};

export const listAllocations = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const { page, limit, offset } = getPagination(req);
    const { rows, count } = await HostelAllocation.findAndCountAll({
      where: { schoolId },
      order: [["id", "DESC"]],
      limit,
      offset,
      include: [{ model: HostelRoom, as: "room" }],
    });
    res.json({
      allocations: rows,
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};

export const createAllocation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const { roomId, studentId, startDate } = req.body ?? {};
    if (!roomId || !studentId || !startDate) {
      return res
        .status(400)
        .json({ message: "roomId, studentId and startDate are required" });
    }

    const room: any = await HostelRoom.findOne({
      where: { id: roomId, schoolId },
    });
    if (!room) return res.status(404).json({ message: "Room not found" });
    if (Number(room.occupied) >= Number(room.capacity)) {
      return res.status(400).json({ message: "Room is full" });
    }

    const allocation = await HostelAllocation.create({
      schoolId,
      roomId,
      studentId,
      startDate,
      status: "active",
    });
    await room.update({ occupied: Number(room.occupied) + 1 });
    res.status(201).json({ message: "Allocation created", allocation });
  } catch (err) {
    next(err);
  }
};

export const deleteAllocation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const allocation: any = await HostelAllocation.findOne({
      where: { id: req.params.id, schoolId },
    });
    if (!allocation) {
      return res.status(404).json({ message: "Allocation not found" });
    }

    if (allocation.status === "active") {
      const room: any = await HostelRoom.findOne({
        where: { id: allocation.roomId, schoolId },
      });
      if (room && Number(room.occupied) > 0) {
        await room.update({ occupied: Number(room.occupied) - 1 });
      }
    }

    await allocation.update({
      status: "ended",
      endDate: new Date().toISOString().slice(0, 10),
    });
    res.json({ message: "Allocation ended", allocation });
  } catch (err) {
    next(err);
  }
};
