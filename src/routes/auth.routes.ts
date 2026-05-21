import { Router } from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
  getProfile,
} from "../controllers/auth.controller";
import { verifyToken } from "../middlewares/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);
router.get("/profile", verifyToken, getProfile);
router.put("/change-password", verifyToken, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
