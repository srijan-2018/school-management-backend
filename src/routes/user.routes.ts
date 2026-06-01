import { Router } from "express";
import {
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
} from "../controllers/user.controller";
import { allowRoles, verifyToken } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken);
router.use(allowRoles("admin", "school_owner"));

router.get("/:id", getUserById);
router.put("/:id", updateUser);

router.get("/", getUsers);
router.post("/", createUser);
router.delete("/:id", deleteUser);

export default router;
