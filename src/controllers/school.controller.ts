import School from "../models/school.model";
import { NextFunction, Request, Response } from "express";
import { create } from "../helpers/crud.helpers";
import { buildPagination, getPagination } from "../utils/pagination";
import { normalizeRole } from "../utils/roles";

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
		const where =
			actorRole === "school_owner"
				? {
						id: actorSchoolId,
					}
				: undefined;

		const { rows: schools, count } = await School.findAndCountAll({
			where,
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
export const createSchool = create(School, "school");

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

		const school: any = await School.findByPk(String(req.params.id));
		if (!school) {
			return res.status(404).json({ message: "school not found" });
		}

		await school.update({ isActive: false });
		res.json({
			message: "school archived successfully",
			school,
		});
	} catch (err) {
		next(err);
	}
};
