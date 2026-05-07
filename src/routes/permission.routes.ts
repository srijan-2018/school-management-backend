import { Router } from "express";
import {
  assignPermissions,
  createPermission,
  getPermissions,
} from "../controllers/permission.controller";
import { allowRoles, verifyToken } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken, allowRoles("admin", "school_owner"));

router.get("/", getPermissions);
router.post("/", createPermission);
router.post("/assign", assignPermissions);

export default router;
