import { NextFunction, Request, Response } from "express";
import Role from "../models/role.model";
import { buildPagination, getPagination } from "../utils/pagination";

export const getRoles = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { rows: roles, count } = await Role.findAndCountAll({
      order: [["id", "DESC"]],
      limit,
      offset,
    });

    res.json({
      roles,
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};

export const createRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const payload = req.body;

    if (Array.isArray(payload)) {
      if (payload.length === 0) {
        return res.status(400).json({ message: "roles payload cannot be empty" });
      }

      const normalizedRows = payload.map((item, index) => {
        const name = String(item?.name ?? "").trim().toLowerCase();

        if (!name) {
          throw new Error(`name is required at index ${index}`);
        }

        return {
          name,
          description: item?.description,
        };
      });

      const uniqueNames = new Set(normalizedRows.map((row) => row.name));

      if (uniqueNames.size !== normalizedRows.length) {
        return res
          .status(400)
          .json({ message: "Duplicate role names found in payload" });
      }

      const existingRoles = await Role.findAll({
        where: {
          name: Array.from(uniqueNames),
        },
      });

      if (existingRoles.length > 0) {
        return res.status(400).json({
          message: "One or more roles already exist",
          existingRoleNames: existingRoles.map((role: any) => role.name),
        });
      }

      const roles = await Role.bulkCreate(normalizedRows);

      return res.status(201).json({
        message: "Roles created successfully",
        roles,
      });
    }

    const { name, description } = payload ?? {};

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    const role = await Role.create({
      name: String(name).trim().toLowerCase(),
      description,
    });

    res.status(201).json({
      message: "Role created successfully",
      role,
    });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("name is required")) {
      return res.status(400).json({ message: err.message });
    }

    next(err);
  }
};

export const updateRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, description } = req.body ?? {};
    const role: any = await Role.findByPk(String(req.params.id));

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (name) {
      role.name = String(name).trim().toLowerCase();
    }

    if (description !== undefined) {
      role.description = description;
    }

    await role.save();

    res.json({
      message: "Role updated successfully",
      role,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const role = await Role.findByPk(String(req.params.id));

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    await role.destroy();

    res.json({ message: "Role deleted successfully" });
  } catch (err) {
    next(err);
  }
};
