import Exam from "../models/exam.model";
import { create, getById, list, update } from "../helpers/crud.helpers";

export const createExam = create(Exam, "exam");
export const getExams = list(Exam, "exams");
export const getExamById = getById(Exam, "exam");
export const updateExam = update(Exam, "exam");
