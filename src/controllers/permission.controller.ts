import { NextFunction, Request, Response } from "express";
import Permission from "../models/permission.model";
import Role from "../models/role.model";
import RolePermission from "../models/role-permission.model";

export const getPermissions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const permissions = await Permission.findAll({
      order: [["id", "DESC"]],
    });

    res.json({ permissions });
  } catch (err) {
    next(err);
  }
};

export const createPermission = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, description } = req.body ?? {};

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    const permission = await Permission.create({
      name: String(name).trim().toLowerCase(),
      description,
    });

    res.status(201).json({
      message: "Permission created successfully",
      permission,
    });
  } catch (err) {
    next(err);
  }
};

export const assignPermissions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { roleId, permissionIds } = req.body ?? {};

    if (!roleId || !Array.isArray(permissionIds)) {
      return res.status(400).json({
        message: "roleId and permissionIds array are required",
      });
    }

    const role = await Role.findByPk(roleId);

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    const permissions = await Permission.findAll({
      where: { id: permissionIds },
    });

    if (permissions.length !== permissionIds.length) {
      return res.status(400).json({
        message: "One or more permissionIds are invalid",
      });
    }

    await RolePermission.destroy({ where: { roleId } });

    await RolePermission.bulkCreate(
      permissionIds.map((permissionId: number) => ({
        roleId,
        permissionId,
      })),
    );

    const updatedRole = await Role.findByPk(roleId, {
      include: [Permission],
    });

    res.json({
      message: "Permissions assigned successfully",
      role: updatedRole,
    });
  } catch (err) {
    next(err);
  }
};
