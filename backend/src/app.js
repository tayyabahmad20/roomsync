import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.routes.js";
import { roomRouter } from "./routes/room.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));

  if (env.nodeEnv !== "production") {
    app.use(morgan("dev"));
  }

  app.get("/health", (_req, res) => res.json({ ok: true, status: "up" }));

  app.use("/api/auth", authRouter);
  app.use("/api/rooms", roomRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
