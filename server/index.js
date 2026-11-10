import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { extractJson } from "./extractJson.js";
import { buildTripPrompt } from "./prompt.js";
import { validateTripInput } from "./validator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "../dist");

const app = express();
const port = Number(process.env.PORT) || 8787;
const geminiTimeoutMs = 25_000;
const mockMode = process.env.MOCK?.toLowerCase();
const geminiModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";

app.use(express.json({ limit: "10kb" }));
app.use(express.static(distPath));

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function mockPlan(tripDetails) {
  const destination =
    typeof tripDetails?.destination === "string" && tripDetails.destination.trim()
      ? tripDetails.destination.trim()
      : "Sample destination";

  return {
    title: `A trip to ${destination}`,
    currency: "USD",
    days: [
      {
        label: "Day 1",
        stops: [
          {
            title: "Explore the city",
            category: "sight",
            estCost: 0,
            description: "Visit a well-known local landmark and nearby neighborhood.",
            location: destination,
            time: "09:00",
          },
        ],
      },
    ],
    packingList: [],
  };
}

async function handleMock(req, res, tripDetails) {
  switch (mockMode) {
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

app.post("/api/plan", async (req, res) => {
  const validation = validateTripInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error });
    return;
  }

  const tripDetails = validation.data;

  if (await handleMock(req, res, tripDetails)) {
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
    return;
  }

  try {
    const url = new URL(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
    );
    url.searchParams.set("key", apiKey);

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
                      enum: ["food", "sight", "activity", "transport", "stay", "other"],
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

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildTripPrompt(tripDetails) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: planResponseSchema,
        },
      }),
      signal: AbortSignal.timeout(geminiTimeoutMs),
    });

    if (!response.ok) {
      res.status(502).json({ error: "Gemini API request failed." });
      return;
    }

    const result = await response.json();
    const generatedText = result.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!generatedText) {
      res.status(502).json({ error: "Gemini returned an empty response." });
      return;
    }

    const plan = extractJson(generatedText);
    if (!plan) {
      res.status(502).json({ error: "Gemini response did not contain a valid JSON itinerary." });
      return;
    }

    res.json(plan);
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
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
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
  res.send("Trip Planner API is running. Access the frontend at http://localhost:5173");
});

const server = app.listen(port, () => {
  console.log(`Trip Planner API listening on http://localhost:${port}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. A process is already running on this port.`);
  } else {
    console.error("Server error:", error);
  }
  process.exit(1);
});
