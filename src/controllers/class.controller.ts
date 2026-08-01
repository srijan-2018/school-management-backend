import { NextFunction, Request, Response } from "express";
import { sequelize } from "../config/db";
import Class from "../models/class.model";
import Section from "../models/section.model";
import ClassSection from "../models/class-section.model";
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
    through: { attributes: [] },
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
  transaction: any,
  schoolId?: number | null,
) => {
  const sectionIds = sections
    .map((section) => section.id)
    .filter((sectionId): sectionId is number => sectionId !== undefined);

  if (sectionIds.length === 0) {
    return [] as any[];
  }

  const where: Record<string, unknown> = { id: sectionIds };
  if (schoolId) {
    where.schoolId = schoolId;
  }

  const sectionRows: any[] = await Section.findAll({
    where,
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

  return sectionRows;
};

const syncClassSections = async (
  classId: number | string,
  sections: SectionInput[],
  transaction: any,
  schoolId?: number | null,
) => {
  const existingSections = await validateSectionIds(
    sections,
    transaction,
    schoolId,
  );
  const existingSectionIds = existingSections.map((section) =>
    Number(section.id),
  );
  const newSections = sections.filter((section) => section.id === undefined);

  const createdSections =
    newSections.length > 0
      ? await Section.bulkCreate(
          newSections.map((section) => ({
            name: String(section.name).trim(),
            classId: null,
            schoolId: schoolId ?? null,
          })),
          { transaction, validate: true },
        )
      : [];

  const linkedSectionIds = [
    ...existingSectionIds,
    ...createdSections.map((section: any) => Number(section.id)),
  ];

  await ClassSection.destroy({
    where: { classId },
    transaction,
  });

  if (linkedSectionIds.length > 0) {
    await ClassSection.bulkCreate(
      linkedSectionIds.map((sectionId) => ({
        classId: Number(classId),
        sectionId,
      })),
      { transaction, ignoreDuplicates: true },
    );
  }
};

const createClassWithSections = async (
  payload: Record<string, unknown>,
  transaction: any,
  schoolId?: number | null,
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
      schoolId: schoolId ?? null,
    },
    { transaction },
  );

  if (sections.length > 0) {
    await syncClassSections(classRow.id, sections, transaction, schoolId);
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
    const where = req.schoolId ? { schoolId: req.schoolId } : undefined;
    const { rows: classes, count } = await Class.findAndCountAll({
      where,
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
    if (!req.schoolId) {
      return res.status(400).json({ message: "School context is required" });
    }

    const schoolId = req.schoolId;
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
            createClassWithSections(classPayload, transaction, schoolId),
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
      createClassWithSections(payload, transaction, schoolId),
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
    const where: Record<string, unknown> = { id: String(req.params.id) };
    if (req.schoolId) where.schoolId = req.schoolId;

    const classRow = await Class.findOne({
      where,
      include: classInclude,
    });

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
    const schoolId = req.schoolId;

    await sequelize.transaction(async (transaction) => {
      const where: Record<string, unknown> = { id: classId };
      if (schoolId) where.schoolId = schoolId;

      const classRow: any = await Class.findOne({ where, transaction });

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

        await syncClassSections(classId, sections, transaction, schoolId);
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
    const schoolId = req.schoolId;

    await sequelize.transaction(async (transaction) => {
      const where: Record<string, unknown> = { id: classId };
      if (schoolId) where.schoolId = schoolId;

      const classRow = await Class.findOne({ where, transaction });

      if (!classRow) {
        throw new AppError("class not found", 404);
      }

      await ClassSection.destroy({
        where: { classId },
        transaction,
      });

      await classRow.destroy({ transaction });
    });

    return res.json({ message: "class deleted successfully" });
  } catch (err) {
    next(err);
  }
};
