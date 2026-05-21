import { Router } from "express";
import {
  createRole,
  deleteRole,
  getRoles,
  updateRole,
} from "../controllers/role.controller";
import { allowRoles, verifyToken } from "../middlewares/auth.middleware";
import { OWNER_LEVEL_ROLES } from "../utils/roles";

const router = Router();

router.use(verifyToken, allowRoles(...OWNER_LEVEL_ROLES));

router.get("/", getRoles);
router.post("/", createRole);
router.put("/:id", updateRole);
router.delete("/:id", deleteRole);

export default router;
