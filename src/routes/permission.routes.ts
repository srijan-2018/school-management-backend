import { Router } from "express";
import {
  assignPermissions,
  createPermission,
  getPermissions,
} from "../controllers/permission.controller";
import { allowRoles, verifyToken } from "../middlewares/auth.middleware";
import { OWNER_LEVEL_ROLES } from "../utils/roles";

const router = Router();

router.use(verifyToken, allowRoles(...OWNER_LEVEL_ROLES));

router.get("/", getPermissions);
router.post("/", createPermission);
router.post("/assign", assignPermissions);

export default router;
