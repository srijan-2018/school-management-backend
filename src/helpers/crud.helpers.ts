import { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";

import { buildPagination, getPagination } from "../utils/pagination";

const pluralize = (key: string) => {
  if (key.endsWith("s")) return `${key}es`;
  if (key.endsWith("y")) return `${key.slice(0, -1)}ies`;
  return `${key}s`;
};

type CrudOptions = {
  schoolScoped?: boolean;
  allowlist?: string[];
};

const getTrustedSchoolId = (req: Request, schoolScoped?: boolean) => {
  if (!schoolScoped) return undefined;
  const schoolId = req.schoolId;
  if (schoolId === null || schoolId === undefined) {
    return null;
  }
  return schoolId;
};

const pickAllowlisted = (
  body: Record<string, unknown> | undefined,
  allowlist?: string[],
) => {
  if (!body || !allowlist?.length) return body ?? {};
  const next: Record<string, unknown> = {};
  for (const key of allowlist) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      next[key] = body[key];
    }
  }
  return next;
};

const stampSchoolId = (
  payload: Record<string, unknown>,
  schoolId: number | null | undefined,
  schoolScoped?: boolean,
) => {
  if (!schoolScoped || schoolId === null || schoolId === undefined) {
    return payload;
  }
  return { ...payload, schoolId };
};

export const list =
  (model: any, key: string, options: CrudOptions = {}) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, offset } = getPagination(req);
      const schoolId = getTrustedSchoolId(req, options.schoolScoped);

      if (options.schoolScoped && (schoolId === null || schoolId === undefined)) {
        return res.status(400).json({
          message: "School context is required",
        });
      }

      const where =
        options.schoolScoped && schoolId
          ? { schoolId }
          : undefined;

      const { rows, count } = await model.findAndCountAll({
        where,
        order: [["id", "DESC"]],
        limit,
        offset,
      });
      res.json({
        [key]: rows,
        pagination: buildPagination(page, limit, count),
      });
    } catch (err) {
      next(err);
    }
  };

export const create =
  (model: any, key: string, options: CrudOptions = {}) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schoolId = getTrustedSchoolId(req, options.schoolScoped);

      if (options.schoolScoped && (schoolId === null || schoolId === undefined)) {
        return res.status(400).json({
          message: "School context is required",
        });
      }

      if (Array.isArray(req.body)) {
        if (req.body.length === 0) {
          return res
            .status(400)
            .json({ message: `${pluralize(key)} payload cannot be empty` });
        }

        const rowsPayload = req.body.map((item: Record<string, unknown>) =>
          stampSchoolId(
            pickAllowlisted(item, options.allowlist) as Record<string, unknown>,
            schoolId,
            options.schoolScoped,
          ),
        );

        const rows = await model.bulkCreate(rowsPayload, { validate: true });

        return res.status(201).json({
          message: `${pluralize(key)} created successfully`,
          [pluralize(key)]: rows,
        });
      }

      const payload = stampSchoolId(
        pickAllowlisted(req.body, options.allowlist) as Record<string, unknown>,
        schoolId,
        options.schoolScoped,
      );

      const row = await model.create(payload);
      res.status(201).json({
        message: `${key} created successfully`,
        [key]: row,
      });
    } catch (err) {
      next(err);
    }
  };

export const getById =
  (model: any, key: string, options: CrudOptions = {}) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schoolId = getTrustedSchoolId(req, options.schoolScoped);

      if (options.schoolScoped && (schoolId === null || schoolId === undefined)) {
        return res.status(400).json({
          message: "School context is required",
        });
      }

      const where: Record<string, unknown> = { id: String(req.params.id) };
      if (options.schoolScoped && schoolId) {
        where.schoolId = schoolId;
      }

      const row = await model.findOne({ where });
      if (!row) return res.status(404).json({ message: `${key} not found` });
      res.json({ [key]: row });
    } catch (err) {
      next(err);
    }
  };

export const update =
  (model: any, key: string, options: CrudOptions = {}) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schoolId = getTrustedSchoolId(req, options.schoolScoped);

      if (options.schoolScoped && (schoolId === null || schoolId === undefined)) {
        return res.status(400).json({
          message: "School context is required",
        });
      }

      const where: Record<string, unknown> = { id: String(req.params.id) };
      if (options.schoolScoped && schoolId) {
        where.schoolId = schoolId;
      }

      const row = await model.findOne({ where });
      if (!row) return res.status(404).json({ message: `${key} not found` });

      const payload = pickAllowlisted(req.body, options.allowlist) as Record<
        string,
        unknown
      >;
      delete payload.schoolId;
      delete payload.id;

      await row.update(payload);
      res.json({ message: `${key} updated successfully`, [key]: row });
    } catch (err) {
      next(err);
    }
  };

export const remove =
  (model: any, key: string, options: CrudOptions = {}) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schoolId = getTrustedSchoolId(req, options.schoolScoped);

      if (options.schoolScoped && (schoolId === null || schoolId === undefined)) {
        return res.status(400).json({
          message: "School context is required",
        });
      }

      const where: Record<string, unknown> = { id: String(req.params.id) };
      if (options.schoolScoped && schoolId) {
        where.schoolId = schoolId;
      }

      const row = await model.findOne({ where });
      if (!row) return res.status(404).json({ message: `${key} not found` });
      await row.destroy();
      res.json({ message: `${key} deleted successfully` });
    } catch (err) {
      next(err);
    }
  };

export const parsePositiveIntegerIds = (value: unknown, field = "ids") => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${field} must be a non-empty array`);
  }

  const ids = Array.from(
    new Set(
      value.map((item, index) => {
        const parsed = Number(item);
        if (!Number.isInteger(parsed) || parsed <= 0) {
          throw new Error(`${field}[${index}] must be a positive integer`);
        }
        return parsed;
      }),
    ),
  );

  return ids;
};

export const bulkRemove =
  (model: any, key: string, options: CrudOptions = {}) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schoolId = getTrustedSchoolId(req, options.schoolScoped);

      if (options.schoolScoped && (schoolId === null || schoolId === undefined)) {
        return res.status(400).json({
          message: "School context is required",
        });
      }

      let ids: number[];
      try {
        ids = parsePositiveIntegerIds(req.body?.ids);
      } catch (error) {
        return res.status(400).json({
          message:
            error instanceof Error ? error.message : "ids must be a non-empty array",
        });
      }

      const where: Record<string, unknown> = { id: { [Op.in]: ids } };
      if (options.schoolScoped && schoolId) {
        where.schoolId = schoolId;
      }

      const rows = await model.findAll({
        where,
        attributes: ["id"],
      });

      if (rows.length !== ids.length) {
        return res.status(404).json({
          message: `One or more ${pluralize(key)} were not found`,
        });
      }

      await model.destroy({ where });

      res.json({
        message:
          ids.length === 1
            ? `${key} deleted successfully`
            : `${ids.length} ${pluralize(key)} deleted successfully`,
        deleted: ids.length,
      });
    } catch (err) {
      next(err);
    }
  };
