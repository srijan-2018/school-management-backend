import Subject from "../models/subject.model";
import { create, list, remove, update } from "./crud.helpers";

export const getSubjects = list(Subject, "subjects");
export const createSubject = create(Subject, "subject");
export const updateSubject = update(Subject, "subject");
export const deleteSubject = remove(Subject, "subject");
