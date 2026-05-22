import { NextFunction, Request, Response } from "express";
import { buildPagination, getPagination } from "../utils/pagination";

const pluralize = (key: string) => {
  if (key.endsWith("s")) return `${key}es`;
  if (key.endsWith("y")) return `${key.slice(0, -1)}ies`;
  return `${key}s`;
};

export const list =
  (model: any, key: string) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, offset } = getPagination(req);
      const { rows, count } = await model.findAndCountAll({
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
  (model: any, key: string) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (Array.isArray(req.body)) {
        if (req.body.length === 0) {
          return res
            .status(400)
            .json({ message: `${pluralize(key)} payload cannot be empty` });
        }

        const rows = await model.bulkCreate(req.body, { validate: true });

        return res.status(201).json({
          message: `${pluralize(key)} created successfully`,
          [pluralize(key)]: rows,
        });
      }

      const row = await model.create(req.body ?? {});
      res.status(201).json({
        message: `${key} created successfully`,
        [key]: row,
      });
    } catch (err) {
      next(err);
    }
  };

export const getById =
  (model: any, key: string) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const row = await model.findByPk(String(req.params.id));
      if (!row) return res.status(404).json({ message: `${key} not found` });
      res.json({ [key]: row });
    } catch (err) {
      next(err);
    }
  };

export const update =
  (model: any, key: string) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const row = await model.findByPk(String(req.params.id));
      if (!row) return res.status(404).json({ message: `${key} not found` });
      await row.update(req.body ?? {});
      res.json({ message: `${key} updated successfully`, [key]: row });
    } catch (err) {
      next(err);
    }
  };

export const remove =
  (model: any, key: string) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const row = await model.findByPk(String(req.params.id));
      if (!row) return res.status(404).json({ message: `${key} not found` });
      await row.destroy();
      res.json({ message: `${key} deleted successfully` });
    } catch (err) {
      next(err);
    }
  };
