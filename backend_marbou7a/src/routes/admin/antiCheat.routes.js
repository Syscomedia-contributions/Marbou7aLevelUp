import { Router } from "express";
import { scanHandler, listFlagsHandler, resolveFlagHandler } from "../../controllers/admin/antiCheat.controller.js";

const router = Router();

router.post("/scan", scanHandler);
router.get("/", listFlagsHandler);
router.patch("/:id/resolve", resolveFlagHandler);

export default router;
