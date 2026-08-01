import { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import PlaygroundItem, {
  PLAYGROUND_CATEGORIES,
  type PlaygroundCategory,
} from "../models/playground-item.model";
import { AppError } from "../middlewares/error.middleware";
import { buildPagination, getPagination } from "../utils/pagination";
import { buildDefaultPlaygroundItems } from "../utils/playground-defaults";
import {
  PLAYGROUND_MANAGER_ROLES,
  PLAYGROUND_VIEW_ROLES,
  normalizeRole,
} from "../utils/roles";

const getActor = (req: Request) => {
  const role = normalizeRole((req as any).user?.role);
  const userId = Number((req as any).user?.id);
  const contextSchoolId = Number(req.schoolId);
  const jwtSchoolId = Number((req as any).user?.schoolId);
  const schoolId =
    Number.isInteger(contextSchoolId) && contextSchoolId > 0
      ? contextSchoolId
      : jwtSchoolId;

  if (!role || !PLAYGROUND_VIEW_ROLES.includes(role)) {
    throw new AppError("Access denied", 403);
  }

  if (!Number.isInteger(schoolId) || schoolId <= 0) {
    throw new AppError("School context is required", 400);
  }

  return {
    role,
    userId: Number.isInteger(userId) && userId > 0 ? userId : null,
    schoolId,
    canManage: PLAYGROUND_MANAGER_ROLES.includes(role),
  };
};

const ensureManageAccess = (req: Request) => {
  const actor = getActor(req);
  if (!actor.canManage) {
    throw new AppError("Access denied", 403);
  }
  return actor;
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

const toNonNegativeInteger = (value: unknown, field: string, fallback = 0) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new AppError(`${field} must be a non-negative integer`, 400);
  }

  return parsed;
};

const toOptionalString = (value: unknown) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
};

const toBoolean = (value: unknown, fallback = true) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;

  throw new AppError("isActive must be a boolean", 400);
};

const normalizeCategory = (value: unknown): PlaygroundCategory => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!PLAYGROUND_CATEGORIES.includes(normalized as PlaygroundCategory)) {
    throw new AppError(
      `Invalid category. Allowed: ${PLAYGROUND_CATEGORIES.join(", ")}`,
      400,
    );
  }

  return normalized as PlaygroundCategory;
};

const serializeItem = (item: PlaygroundItem) => {
  const json = item.toJSON() as Record<string, unknown>;
  const lines = typeof json.lines === "string" ? json.lines : "";
  return {
    ...json,
    sentenceCount: lines
      ? lines
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean).length
      : 0,
  };
};

const seedDefaultsForSchool = async (schoolId: number) => {
  const defaults = buildDefaultPlaygroundItems();
  await PlaygroundItem.bulkCreate(
    defaults.map((item) => ({
      schoolId,
      category: item.category,
      title: item.title,
      emoji: item.emoji ?? null,
      example: item.example ?? null,
      color: item.color ?? null,
      icon: item.icon ?? null,
      lines: item.lines ?? null,
      sortOrder: item.sortOrder,
      isActive: true,
    })),
  );
};

const ensureDefaultsIfEmpty = async (schoolId: number) => {
  const count = await PlaygroundItem.count({ where: { schoolId } });
  if (count === 0) {
    await seedDefaultsForSchool(schoolId);
  }
};

const buildBundle = (items: PlaygroundItem[]) => {
  const letters = items
    .filter((item) => item.category === "letter" && item.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    .map((item) => ({
      letter: item.title,
      word: item.example?.trim() || item.title,
    }));

  const words = items
    .filter((item) => item.category === "word" && item.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    .map((item) => ({
      word: item.title,
      emoji: item.emoji?.trim() || "📘",
      example: item.example?.trim() || "",
      color: item.color?.trim() || "bg-brand-500",
    }));

  const sentenceGroups = items
    .filter((item) => item.category === "sentence_group" && item.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    .map((item) => ({
      type: item.title,
      icon: item.icon?.trim() || "chatbubbles-outline",
      color: item.color?.trim() || "bg-brand-500",
      sentences: String(item.lines ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    }));

  const phrases = items
    .filter((item) => item.category === "phrase" && item.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    .map((item) => item.title);

  return {
    letters,
    words,
    sentenceGroups,
    phrases,
  };
};

export const getPlaygroundBundle = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const actor = getActor(req);
    await ensureDefaultsIfEmpty(actor.schoolId);

    const items = await PlaygroundItem.findAll({
      where: { schoolId: actor.schoolId },
      order: [
        ["category", "ASC"],
        ["sortOrder", "ASC"],
        ["id", "ASC"],
      ],
    });

    res.json({
      bundle: buildBundle(items),
      canManage: actor.canManage,
    });
  } catch (err) {
    next(err);
  }
};

export const seedPlaygroundDefaults = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const actor = ensureManageAccess(req);
    const force = toBoolean(req.body?.force, false);

    const existingCount = await PlaygroundItem.count({
      where: { schoolId: actor.schoolId },
    });

    if (existingCount > 0 && !force) {
      return res.status(400).json({
        message:
          "Playground content already exists. Pass force=true to replace it.",
        count: existingCount,
      });
    }

    if (force && existingCount > 0) {
      await PlaygroundItem.destroy({ where: { schoolId: actor.schoolId } });
    }

    await seedDefaultsForSchool(actor.schoolId);

    const items = await PlaygroundItem.findAll({
      where: { schoolId: actor.schoolId },
      order: [
        ["category", "ASC"],
        ["sortOrder", "ASC"],
        ["id", "ASC"],
      ],
    });

    res.status(201).json({
      message: "Playground defaults seeded successfully",
      count: items.length,
      bundle: buildBundle(items),
    });
  } catch (err) {
    next(err);
  }
};

export const getPlaygroundItems = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const actor = getActor(req);
    const { page, limit, offset } = getPagination(req);
    const category = String(req.query.category ?? "").trim().toLowerCase();
    const search = String(req.query.search ?? "").trim();
    const activeOnly = String(req.query.activeOnly ?? "").trim() === "true";

    const where: Record<string, unknown> = { schoolId: actor.schoolId };

    if (category) {
      where.category = normalizeCategory(category);
    }

    if (activeOnly) {
      where.isActive = true;
    }

    if (search) {
      const searchLike = `%${search}%`;
      where[Op.or as unknown as string] = [
        { title: { [Op.like]: searchLike } },
        { example: { [Op.like]: searchLike } },
        { emoji: { [Op.like]: searchLike } },
        { lines: { [Op.like]: searchLike } },
      ];
    }

    const { rows, count } = await PlaygroundItem.findAndCountAll({
      where,
      order: [
        ["category", "ASC"],
        ["sortOrder", "ASC"],
        ["id", "ASC"],
      ],
      limit,
      offset,
    });

    res.json({
      items: rows.map(serializeItem),
      pagination: buildPagination(page, limit, count),
      canManage: actor.canManage,
    });
  } catch (err) {
    next(err);
  }
};

export const getPlaygroundItemById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const actor = getActor(req);
    const id = toOptionalPositiveInteger(req.params.id, "id");

    if (!id) {
      throw new AppError("Invalid playground item id", 400);
    }

    const item = await PlaygroundItem.findOne({
      where: { id, schoolId: actor.schoolId },
    });

    if (!item) {
      throw new AppError("Playground item not found", 404);
    }

    res.json({ item: serializeItem(item), canManage: actor.canManage });
  } catch (err) {
    next(err);
  }
};

export const createPlaygroundItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const actor = ensureManageAccess(req);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const category = normalizeCategory(body.category);
    const title = String(body.title ?? "").trim();

    if (!title) {
      throw new AppError("title is required", 400);
    }

    const item = await PlaygroundItem.create({
      schoolId: actor.schoolId,
      category,
      title,
      emoji: toOptionalString(body.emoji) ?? null,
      example: toOptionalString(body.example) ?? null,
      color: toOptionalString(body.color) ?? null,
      icon: toOptionalString(body.icon) ?? null,
      lines: toOptionalString(body.lines) ?? null,
      sortOrder: toNonNegativeInteger(body.sortOrder, "sortOrder", 0),
      isActive: toBoolean(body.isActive, true),
    });

    res.status(201).json({
      message: "Playground item created successfully",
      item: serializeItem(item),
    });
  } catch (err) {
    next(err);
  }
};

export const updatePlaygroundItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const actor = ensureManageAccess(req);
    const id = toOptionalPositiveInteger(req.params.id, "id");

    if (!id) {
      throw new AppError("Invalid playground item id", 400);
    }

    const item = await PlaygroundItem.findOne({
      where: { id, schoolId: actor.schoolId },
    });

    if (!item) {
      throw new AppError("Playground item not found", 404);
    }

    const body = (req.body ?? {}) as Record<string, unknown>;

    if (body.category !== undefined) {
      item.category = normalizeCategory(body.category);
    }

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) {
        throw new AppError("title cannot be empty", 400);
      }
      item.title = title;
    }

    if (body.emoji !== undefined) {
      item.emoji = toOptionalString(body.emoji) ?? null;
    }

    if (body.example !== undefined) {
      item.example = toOptionalString(body.example) ?? null;
    }

    if (body.color !== undefined) {
      item.color = toOptionalString(body.color) ?? null;
    }

    if (body.icon !== undefined) {
      item.icon = toOptionalString(body.icon) ?? null;
    }

    if (body.lines !== undefined) {
      item.lines = toOptionalString(body.lines) ?? null;
    }

    if (body.sortOrder !== undefined) {
      item.sortOrder = toNonNegativeInteger(body.sortOrder, "sortOrder", 0);
    }

    if (body.isActive !== undefined) {
      item.isActive = toBoolean(body.isActive, item.isActive);
    }

    await item.save();

    res.json({
      message: "Playground item updated successfully",
      item: serializeItem(item),
    });
  } catch (err) {
    next(err);
  }
};

export const deletePlaygroundItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const actor = ensureManageAccess(req);
    const id = toOptionalPositiveInteger(req.params.id, "id");

    if (!id) {
      throw new AppError("Invalid playground item id", 400);
    }

    const item = await PlaygroundItem.findOne({
      where: { id, schoolId: actor.schoolId },
    });

    if (!item) {
      throw new AppError("Playground item not found", 404);
    }

    await item.destroy();

    res.json({ message: "Playground item deleted successfully" });
  } catch (err) {
    next(err);
  }
};
