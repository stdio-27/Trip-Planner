import { createMiddleware, reportRequestError } from "./middleware.js";
import { createGeminiPlanner } from "./llm/geminiPlanner.js";
import { createDemoPlanner } from "./llm/demoPlanner.js";
import { createPlanningService } from "./services/planning.js";
import { createPlanningRouter } from "./routes/planning.js";
import { serverMode } from "./config.js";
import { loadData } from "./data/index.js";
import "dotenv/config";
import { createJourneyRouter } from "./journeys/routes.js";
import { createPlacesRouter } from "./geo/routes.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import compression from "compression";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "../dist");

export function createApp(options = {}) {
  const app = express();
  const { planLimiter, lookupLimiter, otherApiLimiter, jsonBody, noQuery } =
    createMiddleware();
  const mockMode = options.mockMode ?? process.env.MOCK?.toLowerCase();
  const mockStage = options.mockStage ?? process.env.MOCK_STAGE;
  const geminiModel = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

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

  const places = createPlacesRouter({
    provider: options.geoProvider,
    mockMode,
  });
  app.use("/api/geo", lookupLimiter);
  app.use("/api/hubs", lookupLimiter);
  app.use("/api", places);
  app.use(
    "/api",
    createJourneyRouter({
      limiter: planLimiter,
      jsonBody,
      noQuery,
      mockMode,
      apiKey: options.apiKey ?? process.env.GEMINI_API_KEY,
      model: geminiModel,
      fetchImpl: options.fetch,
    }),
  );

  const livePlanner = createGeminiPlanner({
    apiKey: options.apiKey ?? process.env.GEMINI_API_KEY,
    model: geminiModel,
    fetchImpl: options.fetch,
  });
  const demoPlanner = createDemoPlanner(mockMode, mockStage);
  const planner = {
    generate: async (trip, isOptions) =>
      (await demoPlanner.generate(trip, isOptions)) ??
      livePlanner.generate(trip, isOptions),
  };
  const plan = createPlanningService({ getData: loadData, planner });
  app.use(
    "/api",
    createPlanningRouter({ plan, planLimiter, noQuery, jsonBody }),
  );

  app.get("/api/health", otherApiLimiter, noQuery, (_req, res) => {
    res.json({ ok: true, mode: serverMode(mockMode) });
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
