import Section from "../models/section.model";
import { create, list } from "../helpers/crud.helpers";

export const getSections = list(Section, "sections");
export const createSection = create(Section, "section");
