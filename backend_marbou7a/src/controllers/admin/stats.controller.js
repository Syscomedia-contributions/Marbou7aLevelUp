import { asyncHandler } from "../../middleware/errorHandler.js";
import { getStatsSummary, getStatsCharts } from "../../services/admin/stats.service.js";

export const getStatsSummaryHandler = asyncHandler(async (_req, res) => {
  const summary = await getStatsSummary();
  res.json(summary);
});

export const getStatsChartsHandler = asyncHandler(async (_req, res) => {
  const charts = await getStatsCharts();
  res.json(charts);
});
