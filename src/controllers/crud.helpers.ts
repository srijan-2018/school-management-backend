import { NextFunction, Request, Response } from "express";

export const list = (model: any, key: string) => async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rows = await model.findAll({ order: [["id", "DESC"]] });
    res.json({ [key]: rows });
  } catch (err) {
    next(err);
  }
};

export const create = (model: any, key: string) => async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const row = await model.create(req.body ?? {});
    res.status(201).json({
      message: `${key} created successfully`,
      [key]: row,
    });
  } catch (err) {
    next(err);
  }
};

export const getById = (model: any, key: string) => async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const row = await model.findByPk(String(req.params.id));
    if (!row) return res.status(404).json({ message: `${key} not found` });
    res.json({ [key]: row });
  } catch (err) {
    next(err);
  }
};

export const update = (model: any, key: string) => async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const row = await model.findByPk(String(req.params.id));
    if (!row) return res.status(404).json({ message: `${key} not found` });
    await row.update(req.body ?? {});
    res.json({ message: `${key} updated successfully`, [key]: row });
  } catch (err) {
    next(err);
  }
};

export const remove = (model: any, key: string) => async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const row = await model.findByPk(String(req.params.id));
    if (!row) return res.status(404).json({ message: `${key} not found` });
    await row.destroy();
    res.json({ message: `${key} deleted successfully` });
  } catch (err) {
    next(err);
  }
};
