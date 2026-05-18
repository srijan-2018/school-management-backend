import Class from "../models/class.model";
import { create, list, remove, update } from "../helpers/crud.helpers";

export const getClasses = list(Class, "classes");
export const createClass = create(Class, "class");
export const updateClass = update(Class, "class");
export const deleteClass = remove(Class, "class");
