import { Router } from "express";
import {
  getEarningsSummaryHandler,
  getEarningsTimeseriesHandler,
} from "../../controllers/admin/earnings.controller.js";

const router = Router();

router.get("/summary", getEarningsSummaryHandler);
router.get("/timeseries", getEarningsTimeseriesHandler);

export default router;
