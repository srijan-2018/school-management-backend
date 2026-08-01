import { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import ElearningPlaylist from "../models/elearning-playlist.model";
import ElearningContent, {
  ELEARNING_CONTENT_TYPES,
  type ElearningContentType,
} from "../models/elearning-content.model";
import Class from "../models/class.model";
import School from "../models/school.model";
import Student from "../models/student.model";
import User from "../models/user.model";
import { AppError } from "../middlewares/error.middleware";
import { buildPagination, getPagination } from "../utils/pagination";
import {
  ELEARNING_MANAGER_ROLES,
  ELEARNING_VIEW_ROLES,
  normalizeRole,
} from "../utils/roles";

const userSafeAttributes = {
  exclude: ["password", "resetPasswordToken", "resetPasswordExpires"],
};

const getActor = (req: Request) => {
  const role = normalizeRole((req as any).user?.role);
  const userId = Number((req as any).user?.id);
  const contextSchoolId = Number(req.schoolId);
  const jwtSchoolId = Number((req as any).user?.schoolId);
  const schoolId =
    Number.isInteger(contextSchoolId) && contextSchoolId > 0
      ? contextSchoolId
      : jwtSchoolId;

  if (!role || !ELEARNING_VIEW_ROLES.includes(role)) {
    throw new AppError("Access denied", 403);
  }

  if (!Number.isInteger(schoolId) || schoolId <= 0) {
    throw new AppError("School context is required", 400);
  }

  return {
    role,
    userId: Number.isInteger(userId) && userId > 0 ? userId : null,
    schoolId,
    canManage: ELEARNING_MANAGER_ROLES.includes(role),
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

const toOptionalClassId = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return toOptionalPositiveInteger(value, "classId");
};

const normalizeContentType = (value: unknown): ElearningContentType => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!ELEARNING_CONTENT_TYPES.includes(normalized as ElearningContentType)) {
    throw new AppError(
      `Invalid content type. Allowed types: ${ELEARNING_CONTENT_TYPES.join(", ")}`,
      400,
    );
  }

  return normalized as ElearningContentType;
};

const ensureManageAccess = (req: Request) => {
  const actor = getActor(req);

  if (!actor.canManage) {
    throw new AppError("Students can only view e-learning content", 403);
  }

  return actor;
};

const getStudentClassId = async (userId: number | null) => {
  if (!userId) {
    return null;
  }

  const student = await Student.findOne({ where: { userId } });

  return student ? Number(student.get("classId")) : null;
};

const ensureClassExists = async (classId: number | null) => {
  if (!classId) {
    return;
  }

  const selectedClass = await Class.findByPk(classId);

  if (!selectedClass) {
    throw new AppError("Class not found", 404);
  }
};

const buildClassAccessWhere = async (req: Request, classIdField = "classId") => {
  const actor = getActor(req);
  const where: Record<string, unknown> = {
    schoolId: actor.schoolId,
  };
  const requestedClassId = toOptionalPositiveInteger(req.query.classId, "classId");

  if (actor.role === "student") {
    const studentClassId = await getStudentClassId(actor.userId);

    if (!studentClassId) {
      throw new AppError("Student class is not assigned", 400);
    }

    where[Op.or as unknown as string] = [
      { [classIdField]: null },
      { [classIdField]: studentClassId },
    ];
  } else if (requestedClassId) {
    where[classIdField] = requestedClassId;
  }

  return where;
};

const ensureResourceAccess = async (
  req: Request,
  resource: any,
  classIdField = "classId",
) => {
  const actor = getActor(req);

  if (Number(resource.schoolId) !== actor.schoolId) {
    throw new AppError("Access denied", 403);
  }

  if (actor.role === "student") {
    const studentClassId = await getStudentClassId(actor.userId);
    const resourceClassId = resource[classIdField];

    if (
      resourceClassId !== null &&
      resourceClassId !== undefined &&
      Number(resourceClassId) !== Number(studentClassId)
    ) {
      throw new AppError("Access denied", 403);
    }
  }
};

const playlistInclude = [
  { model: School, attributes: ["id", "name"] },
  { model: Class, attributes: ["id", "name"] },
  {
    model: User,
    as: "createdBy",
    attributes: userSafeAttributes,
  },
];

const contentInclude = [
  { model: School, attributes: ["id", "name"] },
  { model: Class, attributes: ["id", "name"] },
  {
    model: ElearningPlaylist,
    attributes: ["id", "title", "classId"],
  },
  {
    model: User,
    as: "createdBy",
    attributes: userSafeAttributes,
  },
];

export const getElearningPlaylists = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const where = await buildClassAccessWhere(req);
    const search = String(req.query.search ?? "").trim();

    if (search) {
      const searchLike = `%${search}%`;
      where[Op.and as unknown as string] = [
        ...(Array.isArray(where[Op.and as unknown as string])
          ? (where[Op.and as unknown as string] as unknown[])
          : []),
        {
          [Op.or]: [
            { title: { [Op.like]: searchLike } },
            { description: { [Op.like]: searchLike } },
          ],
        },
      ];
    }

    const { rows: playlists, count } = await ElearningPlaylist.findAndCountAll({
      where,
      include: playlistInclude,
      order: [["id", "DESC"]],
      distinct: true,
      limit,
      offset,
    });

    res.json({
      playlists,
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};

export const createElearningPlaylist = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const actor = ensureManageAccess(req);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const title = String(body.title ?? "").trim();

    if (!title) {
      return res.status(400).json({ message: "title is required" });
    }

    const classId = toOptionalClassId(body.classId);
    await ensureClassExists(classId);

    const playlist = await ElearningPlaylist.create({
      schoolId: actor.schoolId,
      title,
      description:
        body.description !== undefined
          ? String(body.description).trim() || null
          : null,
      classId,
      createdByUserId: actor.userId,
    });

    const createdPlaylist = await ElearningPlaylist.findByPk(playlist.get("id"), {
      include: playlistInclude,
    });

    res.status(201).json({
      message: "Playlist created successfully",
      playlist: createdPlaylist,
    });
  } catch (err) {
    next(err);
  }
};

export const getElearningPlaylistById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const playlist: any = await ElearningPlaylist.findByPk(String(req.params.id), {
      include: [
        ...playlistInclude,
        {
          model: ElearningContent,
          as: "contents",
          include: [
            { model: Class, attributes: ["id", "name"] },
            {
              model: User,
              as: "createdBy",
              attributes: userSafeAttributes,
            },
          ],
          separate: true,
          order: [
            ["sortOrder", "ASC"],
            ["id", "ASC"],
          ],
        },
      ],
    });

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    await ensureResourceAccess(req, playlist);

    res.json({ playlist });
  } catch (err) {
    next(err);
  }
};

export const updateElearningPlaylist = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    ensureManageAccess(req);
    const playlist: any = await ElearningPlaylist.findByPk(String(req.params.id));

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    await ensureResourceAccess(req, playlist);

    const body = (req.body ?? {}) as Record<string, unknown>;

    if (body.title !== undefined) {
      const title = String(body.title).trim();

      if (!title) {
        return res.status(400).json({ message: "title cannot be empty" });
      }

      playlist.title = title;
    }

    if (body.description !== undefined) {
      playlist.description = String(body.description).trim() || null;
    }

    if (body.classId !== undefined) {
      const classId = toOptionalClassId(body.classId);
      await ensureClassExists(classId);
      playlist.classId = classId;
    }

    await playlist.save();

    const updatedPlaylist = await ElearningPlaylist.findByPk(playlist.id, {
      include: playlistInclude,
    });

    res.json({
      message: "Playlist updated successfully",
      playlist: updatedPlaylist,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteElearningPlaylist = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    ensureManageAccess(req);
    const playlist: any = await ElearningPlaylist.findByPk(String(req.params.id));

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    await ensureResourceAccess(req, playlist);
    await playlist.destroy();

    res.json({ message: "Playlist deleted successfully" });
  } catch (err) {
    next(err);
  }
};

export const getElearningContents = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const where = await buildClassAccessWhere(req);
    const playlistId = toOptionalPositiveInteger(req.query.playlistId, "playlistId");
    const type = String(req.query.type ?? "").trim().toLowerCase();
    const search = String(req.query.search ?? "").trim();

    if (playlistId) {
      where.playlistId = playlistId;
    }

    if (type) {
      where.type = normalizeContentType(type);
    }

    if (search) {
      const searchLike = `%${search}%`;
      where[Op.and as unknown as string] = [
        ...(Array.isArray(where[Op.and as unknown as string])
          ? (where[Op.and as unknown as string] as unknown[])
          : []),
        {
          [Op.or]: [
            { title: { [Op.like]: searchLike } },
            { description: { [Op.like]: searchLike } },
            { fileName: { [Op.like]: searchLike } },
          ],
        },
      ];
    }

    const { rows: contents, count } = await ElearningContent.findAndCountAll({
      where,
      include: contentInclude,
      order: [
        ["sortOrder", "ASC"],
        ["id", "DESC"],
      ],
      distinct: true,
      subQuery: false,
      limit,
      offset,
    });

    res.json({
      contents,
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};

export const createElearningContent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const actor = ensureManageAccess(req);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const title = String(body.title ?? "").trim();
    const contentUrl = String(body.contentUrl ?? "").trim();

    if (!title) {
      return res.status(400).json({ message: "title is required" });
    }

    if (!contentUrl) {
      return res.status(400).json({ message: "contentUrl is required" });
    }

    const classId = toOptionalClassId(body.classId);
    const playlistId = toOptionalPositiveInteger(body.playlistId, "playlistId");
    await ensureClassExists(classId);

    if (playlistId) {
      const playlist = await ElearningPlaylist.findByPk(playlistId);

      if (!playlist || Number(playlist.get("schoolId")) !== actor.schoolId) {
        return res.status(404).json({ message: "Playlist not found" });
      }
    }

    const content = await ElearningContent.create({
      schoolId: actor.schoolId,
      playlistId: playlistId ?? null,
      title,
      description:
        body.description !== undefined
          ? String(body.description).trim() || null
          : null,
      type: normalizeContentType(body.type),
      contentUrl,
      thumbnailUrl:
        body.thumbnailUrl !== undefined
          ? String(body.thumbnailUrl).trim() || null
          : null,
      fileName:
        body.fileName !== undefined ? String(body.fileName).trim() || null : null,
      classId,
      sortOrder:
        body.sortOrder !== undefined ? Number(body.sortOrder) || 0 : 0,
      createdByUserId: actor.userId,
    });

    const createdContent = await ElearningContent.findByPk(content.get("id"), {
      include: contentInclude,
    });

    res.status(201).json({
      message: "Content created successfully",
      content: createdContent,
    });
  } catch (err) {
    next(err);
  }
};

export const getElearningContentById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const content: any = await ElearningContent.findByPk(String(req.params.id), {
      include: contentInclude,
    });

    if (!content) {
      return res.status(404).json({ message: "Content not found" });
    }

    await ensureResourceAccess(req, content);

    res.json({ content });
  } catch (err) {
    next(err);
  }
};

export const updateElearningContent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    ensureManageAccess(req);
    const content: any = await ElearningContent.findByPk(String(req.params.id));

    if (!content) {
      return res.status(404).json({ message: "Content not found" });
    }

    await ensureResourceAccess(req, content);

    const body = (req.body ?? {}) as Record<string, unknown>;

    if (body.title !== undefined) {
      const title = String(body.title).trim();

      if (!title) {
        return res.status(400).json({ message: "title cannot be empty" });
      }

      content.title = title;
    }

    if (body.description !== undefined) {
      content.description = String(body.description).trim() || null;
    }

    if (body.type !== undefined) {
      content.type = normalizeContentType(body.type);
    }

    if (body.contentUrl !== undefined) {
      const contentUrl = String(body.contentUrl).trim();

      if (!contentUrl) {
        return res.status(400).json({ message: "contentUrl cannot be empty" });
      }

      content.contentUrl = contentUrl;
    }

    if (body.thumbnailUrl !== undefined) {
      content.thumbnailUrl = String(body.thumbnailUrl).trim() || null;
    }

    if (body.fileName !== undefined) {
      content.fileName = String(body.fileName).trim() || null;
    }

    if (body.classId !== undefined) {
      const classId = toOptionalClassId(body.classId);
      await ensureClassExists(classId);
      content.classId = classId;
    }

    if (body.playlistId !== undefined) {
      const playlistId =
        body.playlistId === null || body.playlistId === ""
          ? null
          : toOptionalPositiveInteger(body.playlistId, "playlistId");

      if (playlistId) {
        const playlist = await ElearningPlaylist.findByPk(playlistId);

        if (
          !playlist ||
          Number(playlist.get("schoolId")) !== Number(content.schoolId)
        ) {
          return res.status(404).json({ message: "Playlist not found" });
        }
      }

      content.playlistId = playlistId;
    }

    if (body.sortOrder !== undefined) {
      content.sortOrder = Number(body.sortOrder) || 0;
    }

    await content.save();

    const updatedContent = await ElearningContent.findByPk(content.id, {
      include: contentInclude,
    });

    res.json({
      message: "Content updated successfully",
      content: updatedContent,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteElearningContent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    ensureManageAccess(req);
    const content: any = await ElearningContent.findByPk(String(req.params.id));

    if (!content) {
      return res.status(404).json({ message: "Content not found" });
    }

    await ensureResourceAccess(req, content);
    await content.destroy();

    res.json({ message: "Content deleted successfully" });
  } catch (err) {
    next(err);
  }
};
