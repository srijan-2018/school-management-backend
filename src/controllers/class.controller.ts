import { NextFunction, Request, Response } from "express";
import { sequelize } from "../config/db";
import Class from "../models/class.model";
import Section from "../models/section.model";
import { AppError } from "../middlewares/error.middleware";
import { buildPagination, getPagination } from "../utils/pagination";

type SectionInput = {
  id?: number;
  name?: string;
};

const toSectionId = (value: unknown, field: string) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${field} must be a positive integer`, 400);
  }

  return parsed;
};

const classInclude = [
  {
    model: Section,
    as: "sections",
  },
];

const normalizeSections = (sections: unknown) => {
  if (sections === undefined) return [];

  if (!Array.isArray(sections)) {
    throw new AppError("sections must be an array", 400);
  }

  return sections.map((section, index) => {
    const id = (section as any)?.id;
    const name = (section as any)?.name;

    if (id !== undefined && id !== null && id !== "") {
      return { id: toSectionId(id, `sections[${index}].id`) };
    }

    if (!name || !String(name).trim()) {
      throw new AppError(`sections[${index}] must include id or name`, 400);
    }

    return { name: String(name).trim() };
  });
};

const normalizeSectionName = (section: unknown) => {
  if (section === undefined || section === null || section === "") return null;

  const sectionName = String(section).trim();

  if (!sectionName) {
    throw new AppError("section cannot be empty", 400);
  }

  return sectionName;
};

const getSectionsForPayload = (
  payload: Record<string, unknown>,
): SectionInput[] => {
  const sections = normalizeSections(payload.sections);
  const sectionName = normalizeSectionName(payload.section);

  if (sections.length > 0) {
    return sections;
  }

  return sectionName ? [{ name: sectionName }] : [];
};

const validateSectionIds = async (
  sections: SectionInput[],
  classId: number | string | null,
  transaction: any,
) => {
  const sectionIds = sections
    .map((section) => section.id)
    .filter((sectionId): sectionId is number => sectionId !== undefined);

  if (sectionIds.length === 0) {
    return [] as any[];
  }

  const sectionRows: any[] = await Section.findAll({
    where: { id: sectionIds },
    transaction,
  });
  const sectionMap = new Map(
    sectionRows.map((sectionRow) => [Number(sectionRow.id), sectionRow]),
  );
  const missingIds = sectionIds.filter(
    (sectionId) => !sectionMap.has(sectionId),
  );

  if (missingIds.length > 0) {
    throw new AppError(`Section not found: ${missingIds.join(", ")}`, 400);
  }

  const conflictingIds = sectionRows
    .filter((sectionRow) => {
      const sectionClassId =
        sectionRow.classId === null || sectionRow.classId === undefined
          ? null
          : Number(sectionRow.classId);

      if (sectionClassId === null) {
        return false;
      }

      return Number(classId) !== sectionClassId;
    })
    .map((sectionRow) => Number(sectionRow.id));

  if (conflictingIds.length > 0) {
    throw new AppError(
      `Sections already belong to another class: ${conflictingIds.join(", ")}`,
      400,
    );
  }

  return sectionRows;
};

const syncClassSections = async (
  classId: number | string,
  sections: SectionInput[],
  transaction: any,
) => {
  const existingSections = await validateSectionIds(
    sections,
    classId,
    transaction,
  );
  const existingSectionIds = existingSections.map((section) =>
    Number(section.id),
  );
  const newSections = sections.filter((section) => section.id === undefined);

  await Section.update(
    { classId: null },
    {
      where: { classId },
      transaction,
    },
  );

  if (existingSectionIds.length > 0) {
    await Section.update(
      { classId },
      {
        where: { id: existingSectionIds },
        transaction,
      },
    );
  }

  if (newSections.length > 0) {
    await Section.bulkCreate(
      newSections.map((section) => ({
        name: String(section.name).trim(),
        classId,
      })),
      { transaction, validate: true },
    );
  }
};

const createClassWithSections = async (
  payload: Record<string, unknown>,
  transaction: any,
) => {
  if (!payload.name || !String(payload.name).trim()) {
    throw new AppError("name is required", 400);
  }

  const sectionName = normalizeSectionName(payload.section);
  const sections = getSectionsForPayload(payload);
  const classRow: any = await Class.create(
    {
      name: String(payload.name).trim(),
      section: sectionName,
    },
    { transaction },
  );

  if (sections.length > 0) {
    await syncClassSections(classRow.id, sections, transaction);
  }

  return classRow.id;
};

const findClassWithSections = (id: number | string) =>
  Class.findByPk(id, {
    include: classInclude,
  });

export const getClasses = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { rows: classes, count } = await Class.findAndCountAll({
      include: classInclude,
      order: [["id", "DESC"]],
      distinct: true,
      limit,
      offset,
    });

    res.json({
      classes,
      pagination: buildPagination(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
};

export const createClass = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const payload = req.body ?? {};

    if (Array.isArray(payload)) {
      if (payload.length === 0) {
        return res
          .status(400)
          .json({ message: "classes payload cannot be empty" });
      }

      const classIds = await sequelize.transaction((transaction) =>
        Promise.all(
          payload.map((classPayload) =>
            createClassWithSections(classPayload, transaction),
          ),
        ),
      );
      const classes = await Class.findAll({
        where: { id: classIds },
        include: classInclude,
        order: [["id", "ASC"]],
      });

      return res.status(201).json({
        message: "classes created successfully",
        classes,
      });
    }

    const classId = await sequelize.transaction((transaction) =>
      createClassWithSections(payload, transaction),
    );
    const classRow = await findClassWithSections(classId);

    return res.status(201).json({
      message: "class created successfully",
      class: classRow,
    });
  } catch (err) {
    next(err);
  }
};

export const getClassById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const classRow = await findClassWithSections(String(req.params.id));

    if (!classRow) {
      return res.status(404).json({ message: "class not found" });
    }

    res.json({ class: classRow });
  } catch (err) {
    next(err);
  }
};

export const updateClass = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const classId = String(req.params.id);
    const payload = req.body ?? {};

    await sequelize.transaction(async (transaction) => {
      const classRow: any = await Class.findByPk(classId, { transaction });

      if (!classRow) {
        throw new AppError("class not found", 404);
      }

      if (payload.name !== undefined) {
        if (!String(payload.name).trim()) {
          throw new AppError("name cannot be empty", 400);
        }

        classRow.name = String(payload.name).trim();
      }

      if (payload.section !== undefined) {
        classRow.section = normalizeSectionName(payload.section);
      }

      await classRow.save({ transaction });

      if (payload.sections !== undefined || payload.section !== undefined) {
        const sections = getSectionsForPayload(payload);

        await syncClassSections(classId, sections, transaction);
      }
    });

    const classRow = await findClassWithSections(classId);

    return res.json({
      message: "class updated successfully",
      class: classRow,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteClass = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const classId = String(req.params.id);

    await sequelize.transaction(async (transaction) => {
      const classRow = await Class.findByPk(classId, { transaction });

      if (!classRow) {
        throw new AppError("class not found", 404);
      }

      await Section.update(
        { classId: null },
        {
          where: { classId },
          transaction,
        },
      );

      await classRow.destroy({ transaction });
    });

    return res.json({ message: "class deleted successfully" });
  } catch (err) {
    next(err);
  }
};
