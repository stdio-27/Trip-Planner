import { composeApp } from "./composition.js";
import { createMiddleware, reportRequestError } from "./middleware.js";
import { createPlanningRouter } from "./routes/planning.js";
import { createJourneyRouter } from "./journeys/routes.js";
import { createPlacesRouter } from "./geo/routes.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import compression from "compression";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, "../dist");
export function createApp(options = {}) {
  const app = express();
  const { planLimiter, lookupLimiter, otherApiLimiter, jsonBody, noQuery } =
    createMiddleware();
  const {
    plan,
    places: placeDependencies,
    getJourneys,
    mode,
  } = options.dependencies ?? composeApp(options);
  app.disable("x-powered-by");
  app.use(
    compression({
      filter: (req, res) =>
        !req.path.startsWith("/api/") && compression.filter(req, res),
    }),
  );
  app.use(express.static(distPath));
  app.get("/docs/DATA_SOURCES.md", (_req, res) => {
    res
      .type("text/markdown")
      .sendFile(path.resolve(__dirname, "../docs/DATA_SOURCES.md"));
  });

  app.use("/api/geo", lookupLimiter);
  app.use("/api/hubs", lookupLimiter);
  app.use("/api", createPlacesRouter(placeDependencies));
  app.use(
    "/api",
    createJourneyRouter({
      limiter: planLimiter,
      jsonBody,
      noQuery,
      getJourneys,
    }),
  );
  app.use(
    "/api",
    createPlanningRouter({ plan, planLimiter, noQuery, jsonBody }),
  );
  app.get("/api/health", otherApiLimiter, noQuery, (_req, res) => {
    res.json({ ok: true, mode: mode });
  });

  // Unknown /api routes return 404 JSON
  app.all(["/api", "/api/*"], otherApiLimiter, (_req, res) => {
    res.status(404).json({ error: "API route not found." });
  });

  // Non-/api GET requests fallback to index.html in production if dist exists
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
        return;
      }
    }
    next();
  });

  app.get("/", (req, res) => {
    res.send(
      "Trip Planner API is running. Access the frontend at http://localhost:5173",
    );
  });

  app.use(reportRequestError);
  return app;
}
