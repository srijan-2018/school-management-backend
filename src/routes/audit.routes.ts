import { Router } from "express";

import {
  getAuditAnalyticsSummary,
  getAuditLogs,
} from "../controllers/audit.controller";
import { allowRoles, verifyToken } from "../middlewares/auth.middleware";
import { SCHOOL_CREATION_ROLES } from "../utils/roles";

const router = Router();

router.use(verifyToken, allowRoles(...SCHOOL_CREATION_ROLES));

router.get("/analytics", getAuditAnalyticsSummary);
router.get("/", getAuditLogs);

export default router;
