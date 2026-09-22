import { asyncHandler } from "../../middleware/errorHandler.js";
import {
  getEarningsSummary,
  getEarningsByCategory,
  getEarningsTimeseries,
} from "../../services/admin/earnings.service.js";

export const getEarningsSummaryHandler = asyncHandler(async (_req, res) => {
  const [summary, byCategory] = await Promise.all([getEarningsSummary(), getEarningsByCategory()]);
  res.json({ summary, byCategory });
});

export const getEarningsTimeseriesHandler = asyncHandler(async (_req, res) => {
  const timeseries = await getEarningsTimeseries();
  res.json({ timeseries });
});
