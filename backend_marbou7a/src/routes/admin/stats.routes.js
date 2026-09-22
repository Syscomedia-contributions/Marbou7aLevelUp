import { Router } from "express";
import { getStatsSummaryHandler, getStatsChartsHandler } from "../../controllers/admin/stats.controller.js";

const router = Router();

router.get("/summary", getStatsSummaryHandler);
router.get("/charts", getStatsChartsHandler);

export default router;
