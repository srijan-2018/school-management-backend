import { Request, Response } from "express";

export const requireSchoolId = (req: Request, res: Response): number | null => {
  const schoolId = req.schoolId;
  if (!schoolId) {
    res.status(400).json({ message: "School context is required" });
    return null;
  }
  return schoolId;
};
