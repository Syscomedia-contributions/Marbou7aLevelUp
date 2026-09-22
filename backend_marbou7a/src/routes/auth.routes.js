import { Router } from "express";
import { registerStart, registerVerify, login, me } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { otpStartLimiter, loginLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.post("/register/start", otpStartLimiter, registerStart);
router.post("/register/verify", loginLimiter, registerVerify);
router.post("/login", loginLimiter, login);
router.get("/me", requireAuth, me);

export default router;
