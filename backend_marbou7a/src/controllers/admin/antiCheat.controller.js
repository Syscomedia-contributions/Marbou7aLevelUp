import { z } from "zod";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { scanForFlags, listFlags, resolveFlag } from "../../services/admin/antiCheat.service.js";

const listSchema = z.object({
  resolved: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const scanHandler = asyncHandler(async (_req, res) => {
  const created = await scanForFlags();
  res.json({ created });
});

export const listFlagsHandler = asyncHandler(async (req, res) => {
  const params = listSchema.parse(req.query);
  const result = await listFlags(params);
  res.json(result);
});

export const resolveFlagHandler = asyncHandler(async (req, res) => {
  const flag = await resolveFlag(req.params.id);
  res.json({ flag });
});
