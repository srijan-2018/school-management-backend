import { UserRole } from "../utils/roles";

export type AuthUserPayload = {
  id: number;
  role: UserRole | string;
  schoolId?: number | null;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
      schoolId?: number | null;
      schoolContextRequired?: boolean;
    }
  }
}

export {};
