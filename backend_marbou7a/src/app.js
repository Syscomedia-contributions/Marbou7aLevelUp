import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/auth.routes.js";
import quizRoutes from "./routes/quiz.routes.js";
import gamesRoutes from "./routes/games.routes.js";
import progressionRoutes from "./routes/progression.routes.js";
import leaderboardRoutes from "./routes/leaderboard.routes.js";
import adminRoutes from "./routes/admin/index.js";
import { requireAuth, requireAdmin } from "./middleware/auth.js";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigins,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/games", gamesRoutes);
app.use("/api/progression", progressionRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/admin", requireAuth, requireAdmin, adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
