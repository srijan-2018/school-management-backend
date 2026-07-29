import { Router } from "express";
import {
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
} from "../controllers/user.controller";
import { allowRoles, verifyToken } from "../middlewares/auth.middleware";
import { resolveSchoolContext } from "../middlewares/school-context.middleware";
import { USER_MANAGER_ROLES } from "../utils/roles";

const router = Router();

router.use(verifyToken, resolveSchoolContext(), allowRoles(...USER_MANAGER_ROLES));

router.get("/:id", getUserById);
router.put("/:id", updateUser);

router.get("/", getUsers);
router.post("/", createUser);
router.delete("/:id", deleteUser);

export default router;
