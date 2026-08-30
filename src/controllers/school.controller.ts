import School from "../models/school.model";
import { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import { buildPagination, getPagination } from "../utils/pagination";
import { normalizeRole } from "../utils/roles";
import { permanentlyDeleteSchool } from "../services/delete-school.service";
import { ensureSchoolFeatures } from "../services/school-feature.service";

export const getSchools = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const actorRole = normalizeRole((req as any).user?.role);
		const actorSchoolId = Number((req as any).user?.schoolId);

		if (
			actorRole === "school_owner" &&
			(!Number.isInteger(actorSchoolId) || actorSchoolId <= 0)
		) {
			return res
				.status(400)
				.json({ message: "school_owner is not attached to any school" });
		}

		const { page, limit, offset } = getPagination(req);
		const search = String(req.query.search ?? req.query.keyword ?? "").trim();
		const where: Record<string, unknown> = {};

		if (actorRole === "school_owner") {
			where.id = actorSchoolId;
		}

		where.isActive = true;

		if (search) {
			const searchLike = `%${search}%`;
			where[Op.or as unknown as string] = [
				{ name: { [Op.like]: searchLike } },
				{ code: { [Op.like]: searchLike } },
				{ email: { [Op.like]: searchLike } },
			];
		}

		const { rows: schools, count } = await School.findAndCountAll({
			where: Object.keys(where).length > 0 ? where : undefined,
			order: [["id", "DESC"]],
			limit,
			offset,
		});

		res.json({
			schools,
			pagination: buildPagination(page, limit, count),
		});
	} catch (err) {
		next(err);
	}
};
export const createSchool = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const payload = req.body ?? {};
		if (Array.isArray(payload)) {
			if (payload.length === 0) {
				return res.status(400).json({ message: "schools payload cannot be empty" });
			}

			const schools = await School.bulkCreate(payload, { validate: true });
			await Promise.all(
				schools.map((school) => ensureSchoolFeatures(Number(school.id))),
			);

			return res.status(201).json({
				message: "schools created successfully",
				schools,
			});
		}

		const school = await School.create(payload);
		await ensureSchoolFeatures(Number(school.id));

		return res.status(201).json({
			message: "school created successfully",
			school,
		});
	} catch (err) {
		next(err);
	}
};

export const getSchoolById = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const actorRole = normalizeRole((req as any).user?.role);
		const actorSchoolId = Number((req as any).user?.schoolId);
		const schoolId = Number(req.params.id);

		if (
			actorRole === "school_owner" &&
			(!Number.isInteger(actorSchoolId) || actorSchoolId <= 0)
		) {
			return res
				.status(400)
				.json({ message: "school_owner is not attached to any school" });
		}

		if (actorRole === "school_owner" && schoolId !== actorSchoolId) {
			return res.status(403).json({ message: "Access denied" });
		}

		const school = await School.findByPk(String(req.params.id));

		if (!school) {
			return res.status(404).json({ message: "school not found" });
		}

		res.json({ school });
	} catch (err) {
		next(err);
	}
};

export const updateSchool = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const actorRole = normalizeRole((req as any).user?.role);
		const actorSchoolId = Number((req as any).user?.schoolId);
		const schoolId = Number(req.params.id);

		if (
			actorRole === "school_owner" &&
			(!Number.isInteger(actorSchoolId) || actorSchoolId <= 0)
		) {
			return res
				.status(400)
				.json({ message: "school_owner is not attached to any school" });
		}

		if (actorRole === "school_owner" && schoolId !== actorSchoolId) {
			return res.status(403).json({ message: "Access denied" });
		}

		const school: any = await School.findByPk(String(req.params.id));

		if (!school) {
			return res.status(404).json({ message: "school not found" });
		}

		await school.update(req.body ?? {});

		res.json({ message: "school updated successfully", school });
	} catch (err) {
		next(err);
	}
};

export const deleteSchool = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const actorRole = normalizeRole(req.user?.role);
		if (actorRole !== "admin") {
			return res.status(403).json({ message: "Access denied" });
		}

		const schoolId = Number(req.params.id);
		if (!Number.isInteger(schoolId) || schoolId <= 0) {
			return res.status(400).json({ message: "Invalid school id" });
		}

		const school = await School.findByPk(schoolId);
		if (!school) {
			return res.status(404).json({ message: "school not found" });
		}

		await permanentlyDeleteSchool(schoolId);
		res.json({
			message: "school deleted successfully",
			id: schoolId,
		});
	} catch (err) {
		next(err);
	}
};
