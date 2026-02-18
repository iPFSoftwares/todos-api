import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import todosRouter from "./routes/todos";
import { errorHandler } from "./middleware/error";
import authRouter from "./routes/auth";

export function createApp() {
  const app = express();

  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const durationMs = Date.now() - start;
      console.log(
        `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`
      );
    });
    next();
  });

  const origin = process.env.CORS_ORIGIN || "http://localhost:3000";
  app.use(
    cors({
      origin,
      credentials: true
    })
  );
  app.use(cookieParser());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/", (_req, res) => {
    res.redirect("/docs");
  });

  if (process.env.NODE_ENV !== "test") {
    // Load swagger only outside tests to avoid optional dependency issues.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const swaggerUi = require("swagger-ui-express");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { swaggerSpec } = require("./swagger");
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  }

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/todos", todosRouter);

  app.use(errorHandler);

  return app;
}
