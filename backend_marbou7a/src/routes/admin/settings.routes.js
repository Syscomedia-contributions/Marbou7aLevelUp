import { Router } from "express";
import { changePasswordHandler } from "../../controllers/admin/settings.controller.js";

const router = Router();

router.patch("/password", changePasswordHandler);

export default router;
