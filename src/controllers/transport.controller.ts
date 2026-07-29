import { NextFunction, Request, Response } from "express";
import TransportVehicle from "../models/transport-vehicle.model";
import TransportRoute from "../models/transport-route.model";
import TransportAssignment from "../models/transport-assignment.model";
import { requireSchoolId } from "../helpers/school-scope";
import { buildPagination, getPagination } from "../utils/pagination";

const scopedList =
  (model: any, key: string) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schoolId = requireSchoolId(req, res);
      if (!schoolId) return;
      const { page, limit, offset } = getPagination(req);
      const { rows, count } = await model.findAndCountAll({
        where: { schoolId },
        order: [["id", "DESC"]],
        limit,
        offset,
      });
      res.json({ [key]: rows, pagination: buildPagination(page, limit, count) });
    } catch (err) {
      next(err);
    }
  };

const scopedCreate =
  (model: any, key: string) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schoolId = requireSchoolId(req, res);
      if (!schoolId) return;
      const row = await model.create({ ...(req.body ?? {}), schoolId });
      res.status(201).json({ message: `${key} created`, [key]: row });
    } catch (err) {
      next(err);
    }
  };

const scopedUpdate =
  (model: any, key: string) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schoolId = requireSchoolId(req, res);
      if (!schoolId) return;
      const row: any = await model.findOne({
        where: { id: req.params.id, schoolId },
      });
      if (!row) return res.status(404).json({ message: `${key} not found` });
      const payload = { ...(req.body ?? {}) };
      delete payload.schoolId;
      await row.update(payload);
      res.json({ message: `${key} updated`, [key]: row });
    } catch (err) {
      next(err);
    }
  };

const scopedDelete =
  (model: any, key: string) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schoolId = requireSchoolId(req, res);
      if (!schoolId) return;
      const row = await model.findOne({
        where: { id: req.params.id, schoolId },
      });
      if (!row) return res.status(404).json({ message: `${key} not found` });
      await row.destroy();
      res.json({ message: `${key} deleted` });
    } catch (err) {
      next(err);
    }
  };

export const listVehicles = scopedList(TransportVehicle, "vehicles");
export const createVehicle = scopedCreate(TransportVehicle, "vehicle");
export const updateVehicle = scopedUpdate(TransportVehicle, "vehicle");
export const deleteVehicle = scopedDelete(TransportVehicle, "vehicle");

export const listRoutes = scopedList(TransportRoute, "routes");
export const createRoute = scopedCreate(TransportRoute, "route");
export const updateRoute = scopedUpdate(TransportRoute, "route");
export const deleteRoute = scopedDelete(TransportRoute, "route");

export const listAssignments = scopedList(TransportAssignment, "assignments");
export const createAssignment = scopedCreate(TransportAssignment, "assignment");
export const deleteAssignment = scopedDelete(TransportAssignment, "assignment");
