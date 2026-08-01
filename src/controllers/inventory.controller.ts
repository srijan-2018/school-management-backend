import { NextFunction, Request, Response } from "express";
import { Op, literal } from "sequelize";
import InventoryItem from "../models/inventory-item.model";
import School from "../models/school.model";
import { AppError } from "../middlewares/error.middleware";
import { buildPagination, getPagination } from "../utils/pagination";
import { normalizeRole } from "../utils/roles";

const getActorSchoolId = (schoolId: number | null) => {
  if (!schoolId) {
    throw new AppError("User is not attached to any school", 400);
  }

  return schoolId;
};

const getActor = (req: Request) => {
  const role = normalizeRole((req as any).user?.role);
  const contextSchoolId = Number(req.schoolId);
  const jwtSchoolId = Number((req as any).user?.schoolId);
  const schoolId =
    Number.isInteger(contextSchoolId) && contextSchoolId > 0
      ? contextSchoolId
      : Number.isInteger(jwtSchoolId) && jwtSchoolId > 0
        ? jwtSchoolId
        : null;

  if (!role) {
    throw new AppError("Access denied", 403);
  }

  return {
    role,
    schoolId,
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

const toNonNegativeNumber = (value: unknown, field: string) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new AppError(`${field} must be a non-negative number`, 400);
  }

  return parsed;
};

const resolveSchoolIdForCreate = async (
  req: Request,
  body: Record<string, unknown>,
) => {
  const actor = getActor(req);
  const requestedSchoolId = toOptionalPositiveInteger(body.schoolId, "schoolId");

  const actorSchoolId = getActorSchoolId(actor.schoolId);

  if (requestedSchoolId && requestedSchoolId !== actorSchoolId) {
    throw new AppError("You can only manage inventory for your own school", 403);
  }

  return actorSchoolId;
};

const ensureItemAccess = (req: Request, item: any) => {
  const actor = getActor(req);

  const actorSchoolId = getActorSchoolId(actor.schoolId);

  if (Number(item.schoolId) !== actorSchoolId) {
    throw new AppError("Access denied", 403);
  }
};

const getStockStatus = (quantity: number, minQuantity: number) => {
  if (quantity <= 0) {
    return "out_of_stock";
  }

  if (minQuantity > 0 && quantity <= minQuantity) {
    return "low_stock";
  }

  return "available";
};

const serializeInventoryItem = (item: any) => {
  const quantity = Number(item.quantity ?? 0);
  const minQuantity = Number(item.minQuantity ?? 0);

  return {
    ...item.toJSON(),
    stockStatus: getStockStatus(quantity, minQuantity),
  };
};

const buildInventoryWhere = (req: Request) => {
  const actor = getActor(req);
  const where: Record<string, unknown> = {};
  const andConditions: unknown[] = [];
  const requestedSchoolId = toOptionalPositiveInteger(req.query.schoolId, "schoolId");
  const category = String(req.query.category ?? "").trim();
  const search = String(req.query.search ?? req.query.keyword ?? "").trim();
  const stockStatus = String(req.query.stockStatus ?? "").trim().toLowerCase();

  const actorSchoolId = getActorSchoolId(actor.schoolId);

  if (requestedSchoolId && requestedSchoolId !== actorSchoolId) {
    throw new AppError("Access denied", 403);
  }

  where.schoolId = actorSchoolId;

  if (category) {
    where.category = category;
  }

  if (search) {
    const searchLike = `%${search}%`;

    andConditions.push({
      [Op.or]: [
        { name: { [Op.like]: searchLike } },
        { category: { [Op.like]: searchLike } },
        { unit: { [Op.like]: searchLike } },
        { description: { [Op.like]: searchLike } },
        { location: { [Op.like]: searchLike } },
        { "$School.name$": { [Op.like]: searchLike } },
      ],
    });
  }

  if (stockStatus === "out_of_stock") {
    where.quantity = { [Op.lte]: 0 };
  } else if (stockStatus === "low_stock") {
    andConditions.push(
      { quantity: { [Op.gt]: 0 } },
      { minQuantity: { [Op.gt]: 0 } },
      literal("`InventoryItem`.`quantity` <= `InventoryItem`.`minQuantity`"),
    );
  } else if (stockStatus === "available") {
    andConditions.push({
      [Op.or]: [
        { minQuantity: { [Op.lte]: 0 } },
        literal("`InventoryItem`.`quantity` > `InventoryItem`.`minQuantity`"),
      ],
    });
  }

  if (andConditions.length > 0) {
    where[Op.and as unknown as string] = andConditions;
  }

  return where;
};

export const getInventoryItems = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const where = buildInventoryWhere(req);
    const { rows: items, count } = await InventoryItem.findAndCountAll({
      where,
      include: [
        {
          model: School,
          attributes: ["id", "name"],
        },
      ],
      order: [["id", "DESC"]],
      distinct: true,
      subQuery: false,
      limit,
      offset,
    });

    res.json({
      inventoryItems: items.map(serializeInventoryItem),
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};

export const createInventoryItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    const schoolId = await resolveSchoolIdForCreate(req, body);
    const quantity = toNonNegativeNumber(body.quantity ?? 0, "quantity");
    const minQuantity =
      body.minQuantity !== undefined && body.minQuantity !== null && body.minQuantity !== ""
        ? toNonNegativeNumber(body.minQuantity, "minQuantity")
        : 0;

    const item = await InventoryItem.create({
      schoolId,
      name,
      category:
        body.category !== undefined ? String(body.category).trim() || null : null,
      quantity,
      unit: body.unit !== undefined ? String(body.unit).trim() || null : null,
      minQuantity,
      description:
        body.description !== undefined
          ? String(body.description).trim() || null
          : null,
      location:
        body.location !== undefined ? String(body.location).trim() || null : null,
    });

    const createdItem = await InventoryItem.findByPk(item.get("id"), {
      include: [{ model: School, attributes: ["id", "name"] }],
    });

    res.status(201).json({
      message: "Inventory item created successfully",
      inventoryItem: serializeInventoryItem(createdItem),
    });
  } catch (err) {
    next(err);
  }
};

export const getInventoryItemById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const item: any = await InventoryItem.findByPk(String(req.params.id), {
      include: [{ model: School, attributes: ["id", "name"] }],
    });

    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    ensureItemAccess(req, item);

    res.json({
      inventoryItem: serializeInventoryItem(item),
    });
  } catch (err) {
    next(err);
  }
};

export const updateInventoryItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const item: any = await InventoryItem.findByPk(String(req.params.id));

    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    ensureItemAccess(req, item);

    const body = (req.body ?? {}) as Record<string, unknown>;

    if (body.name !== undefined) {
      const name = String(body.name).trim();

      if (!name) {
        return res.status(400).json({ message: "name cannot be empty" });
      }

      item.name = name;
    }

    if (body.category !== undefined) {
      item.category = String(body.category).trim() || null;
    }

    if (body.quantity !== undefined) {
      item.quantity = toNonNegativeNumber(body.quantity, "quantity");
    }

    if (body.unit !== undefined) {
      item.unit = String(body.unit).trim() || null;
    }

    if (body.minQuantity !== undefined) {
      item.minQuantity = toNonNegativeNumber(body.minQuantity, "minQuantity");
    }

    if (body.description !== undefined) {
      item.description = String(body.description).trim() || null;
    }

    if (body.location !== undefined) {
      item.location = String(body.location).trim() || null;
    }

    await item.save();

    const updatedItem = await InventoryItem.findByPk(item.id, {
      include: [{ model: School, attributes: ["id", "name"] }],
    });

    res.json({
      message: "Inventory item updated successfully",
      inventoryItem: serializeInventoryItem(updatedItem),
    });
  } catch (err) {
    next(err);
  }
};

export const adjustInventoryStock = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const item: any = await InventoryItem.findByPk(String(req.params.id));

    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    ensureItemAccess(req, item);

    const type = String(req.body?.type ?? "").trim().toLowerCase();
    const quantity = toNonNegativeNumber(req.body?.quantity, "quantity");

    if (!["in", "out"].includes(type)) {
      return res.status(400).json({ message: "type must be in or out" });
    }

    if (quantity <= 0) {
      return res.status(400).json({ message: "quantity must be greater than 0" });
    }

    const currentQuantity = Number(item.quantity ?? 0);
    const nextQuantity =
      type === "in" ? currentQuantity + quantity : currentQuantity - quantity;

    if (nextQuantity < 0) {
      return res.status(400).json({ message: "Insufficient stock available" });
    }

    item.quantity = nextQuantity;
    await item.save();

    const updatedItem = await InventoryItem.findByPk(item.id, {
      include: [{ model: School, attributes: ["id", "name"] }],
    });

    res.json({
      message: `Stock ${type === "in" ? "added" : "removed"} successfully`,
      adjustment: {
        type,
        quantity,
        previousQuantity: currentQuantity,
        currentQuantity: nextQuantity,
      },
      inventoryItem: serializeInventoryItem(updatedItem),
    });
  } catch (err) {
    next(err);
  }
};

export const deleteInventoryItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const item: any = await InventoryItem.findByPk(String(req.params.id));

    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    ensureItemAccess(req, item);
    await item.destroy();

    res.json({ message: "Inventory item deleted successfully" });
  } catch (err) {
    next(err);
  }
};
