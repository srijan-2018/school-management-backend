import School from "../models/school.model";
import { create, getById, list, update } from "./crud.helpers";

export const getSchools = list(School, "schools");
export const createSchool = create(School, "school");
export const getSchoolById = getById(School, "school");
export const updateSchool = update(School, "school");
