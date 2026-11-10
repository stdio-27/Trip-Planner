import "dotenv/config";
import { createJourneyRouter } from "./journeys/routes.js";
import { resolveTripPlaces } from "./tripPlaces.js";
import { createPlacesRouter } from "./geo/routes.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import rateLimit from "express-rate-limit";
import { extractJson } from "./extractJson.js";
import { buildTripPrompt, buildOptionsPrompt } from "./prompt.js";
import { validateTripInput } from "./validator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "../dist");

import { parseOptions } from "../shared/optionsSchema.js";
import { demoOptions } from "./demoOptions.js";
import { validateGeneratedPlan } from "./planSchema.js";

export function createApp(options = {}) {
  const app = express();
  const geminiTimeoutMs = 25_000;
  const mockMode = options.mockMode ?? process.env.MOCK?.toLowerCase();
  const geminiModel = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

  app.use(express.json({ limit: "10kb" }));
  app.use(express.static(distPath));

  function delay(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  function mockPlan(tripDetails) {
    const destination =
      typeof tripDetails?.destination === "string" &&
      tripDetails.destination.trim()
        ? tripDetails.destination.trim()
        : "Sample destination";

    return {
      title: `A trip to ${destination}`,
      currency: tripDetails.currency,
      days: Array.from({ length: tripDetails.days }, (_, index) => ({
        label: `Day ${index + 1}`,
        stops: [
          {
            title: "Explore the city",
            category: "sight",
            estCost: 0,
            description:
              "Visit a well-known local landmark and nearby neighborhood.",
            location: destination,
            time: "09:00",
          },
        ],
      })),
      packingList: [],
    };
  }

  async function handleMock(req, res, tripDetails) {
    if (req.path === "/api/options") {
      if (mockMode === "options-bad-shape") {
        res.json({ unexpected: true });
        return true;
      }
      if (mockMode === "options-empty") {
        res.status(200).end();
        return true;
      }
      if (["demo", "jitter", "slow", "wrong-days"].includes(mockMode)) {
        if (mockMode === "jitter") await delay(Math.random() * 5000);
        if (mockMode === "slow") await delay(40000);
        res.json(demoOptions(tripDetails));
        return true;
      }
    }
    switch (mockMode) {
      case "wrong-days":
        res.json(
          mockPlan({
            ...tripDetails,
            days: tripDetails.days === 1 ? 2 : tripDetails.days - 1,
          }),
        );
        return true;
      case "demo":
        res.json(mockPlan(tripDetails));
        return true;
      case "jitter":
        await delay(Math.floor(Math.random() * 5_000));
        res.json(mockPlan(tripDetails || req.body));
        return true;
      case "slow":
        await delay(40_000);
        res.json(mockPlan(tripDetails || req.body));
        return true;
      case "bad-json":
        res.status(200).type("application/json").send('{"invalid":');
        return true;
      case "bad-shape":
        res.json({ unexpected: true });
        return true;
      case "empty":
        res.status(200).end();
        return true;
      case "fail":
        res.status(500).json({ error: "Mock server failure." });
        return true;
      default:
        return false;
    }
  }

  const planLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        code: "RATE_LIMITED",
        error:
          "Too many trip planning requests. Please wait a minute before trying again.",
      });
    },
  });

  const places = createPlacesRouter({
    provider: options.geoProvider,
    mockMode,
  });
  app.use("/api/geo", planLimiter);
  app.use("/api/hubs", planLimiter);
  app.use("/api", places);
  app.use("/api", createJourneyRouter({
    limiter: planLimiter,
    mockMode,
    apiKey: options.apiKey ?? process.env.GEMINI_API_KEY,
    model: geminiModel,
    fetchImpl: options.fetch,
  }));

  app.post(["/api/plan", "/api/options"], planLimiter, async (req, res) => {
    const validation = validateTripInput(req.body);
    if (!validation.valid) {
      res.status(400).json({ errors: validation.errors, error: validation.error });
      return;
    }

    const resolved = resolveTripPlaces(validation.data);
    if (resolved.errors) {
      res.status(400).json({ errors: resolved.errors, error: Object.values(resolved.errors)[0] });
      return;
    }
    const tripDetails = resolved.data;
    const isOptions = req.path === "/api/options";

    if (await handleMock(req, res, tripDetails)) {
      return;
    }

    const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
      return;
    }

    try {
      const url = new URL(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
      );

      const planResponseSchema = {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          currency: { type: "STRING" },
          days: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                label: { type: "STRING" },
                stops: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      title: { type: "STRING" },
                      category: {
                        type: "STRING",
                        enum: [
                          "food",
                          "sight",
                          "activity",
                          "transport",
                          "stay",
                          "other",
                        ],
                      },
                      estCost: { type: "NUMBER" },
                      description: { type: "STRING" },
                      location: { type: "STRING" },
                      time: { type: "STRING" },
                    },
                    required: ["title", "category", "estCost"],
                  },
                },
              },
              required: ["label", "stops"],
            },
          },
          packingList: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
        },
        required: ["title", "currency", "days", "packingList"],
      };

      let returnedDays;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const response = await (options.fetch ?? fetch)(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text:
                      (isOptions
                        ? buildOptionsPrompt(tripDetails)
                        : buildTripPrompt(tripDetails)) +
                      (attempt
                        ? (isOptions ? "\nCorrection: return the complete valid options object in the requested currency, with all four option groups." : `\nCorrection: you returned ${returnedDays} days; return exactly ${tripDetails.days} day objects.`)
                        : ""),
                  },
                ],
              },
            ],
            generationConfig: {
              maxOutputTokens: 16384,
              responseMimeType: "application/json",
              ...(isOptions ? {} : { responseSchema: planResponseSchema }),
            },
          }),
          signal: AbortSignal.timeout(geminiTimeoutMs),
        });

        if (!response.ok) {
          // Keep provider payloads and credentials out of browser errors and logs.
          console.error("Gemini API rejected request", {
            status: response.status,
            model: geminiModel,
          });
          const messages = {
            400: "Gemini rejected the request. Check the server API key and model configuration.",
            401: "Gemini authentication failed. Check GEMINI_API_KEY on the server.",
            403: "Gemini access denied. Check the API key permissions and project configuration.",
            404: `Gemini model ${geminiModel} is unavailable. Update GEMINI_MODEL and restart the server.`,
            429: "Gemini quota or rate limit reached. Check your Google AI quota and billing, then try again.",
          };
          res.status(response.status === 429 ? 429 : 502).json({
            error:
              messages[response.status] ??
              "Gemini is temporarily unavailable. Please try again later.",
          });
          return;
        }

        // Bound the upstream body before parsing or scanning model output.
        const reader = response.body.getReader();
        const chunks = [];
        let size = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 1_000_000) {
            await reader.cancel();
            res
              .status(502)
              .json({ error: "Gemini response exceeded the size limit." });
            return;
          }
          chunks.push(Buffer.from(value));
        }
        const result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        const generatedText = result.candidates?.[0]?.content?.parts
          ?.map((part) => part.text ?? "")
          .join("")
          .trim();

        if (!generatedText) {
          if (attempt === 0) continue;
          res.status(502).json({ error: "Gemini returned an empty response." });
          return;
        }

        const plan = extractJson(generatedText);
        if (!plan) {
          if (attempt === 0) continue;
          res
            .status(502)
            .json({
              error: "Gemini response did not contain a valid JSON itinerary.",
            });
          return;
        }

        if (isOptions) {
          const parsed = parseOptions(plan);
          if (
            (!parsed.success ||
              parsed.data.currency !== tripDetails.currency) &&
            attempt === 0
          )
            continue;
          if (
            !parsed.success ||
            parsed.data.currency !== tripDetails.currency
          ) {
            res.status(502).json({ error: "Gemini returned invalid options." });
            return;
          }
          res.json(parsed.data);
          return;
        }
        returnedDays = plan.days?.length;
        if (
          Array.isArray(plan.days) &&
          plan.days.length > 0 &&
          plan.days.length !== tripDetails.days &&
          attempt === 0
        )
          continue;
        const validated = validateGeneratedPlan(plan, tripDetails);
        if (!validated.success) {
          res
            .status(502)
            .json({
              error:
                "Gemini returned an invalid itinerary shape, currency, or day count.",
            });
          return;
        }
        res.json(validated.data);
        return;
      }
    } catch (error) {
      if (error?.name === "TimeoutError" || error?.name === "AbortError") {
        res.status(504).json({ error: "Gemini API request timed out." });
        return;
      }

      console.error(
        "Trip plan generation failed:",
        error instanceof Error ? error.name : "UnknownError",
      );
      res.status(502).json({ error: "Trip plan generation failed." });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ ok: true, status: "healthy" });
  });

  // Unknown /api routes return 404 JSON
  app.all("/api/*", (req, res) => {
    res
      .status(404)
      .json({ error: `Not found: ${req.method} ${req.originalUrl}` });
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

  return app;
}
