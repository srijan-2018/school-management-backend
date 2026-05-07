import { Router } from "express";
import {
  createRole,
  deleteRole,
  getRoles,
  updateRole,
} from "../controllers/role.controller";
import { allowRoles, verifyToken } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken, allowRoles("admin", "school_owner"));

router.get("/", getRoles);
router.post("/", createRole);
router.put("/:id", updateRole);
router.delete("/:id", deleteRole);

export default router;
