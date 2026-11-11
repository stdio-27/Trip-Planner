import "dotenv/config";
import { setTimeout as delay } from "node:timers/promises";
import { loadData } from "./data/index.js";
import { buildJourneys } from "./journeys/engine.js";
import { demoFares, estimateFares, parseFareText } from "./journeys/fares.js";
import { createOpenMeteoProvider } from "./geo/provider.js";
import { createGeminiPlanner } from "./llm/geminiPlanner.js";
import { createDemoPlanner } from "./llm/demoPlanner.js";
import { createPlanningService } from "./services/planning.js";
import { createJourneyService } from "./services/journeys.js";
import { demoFareModes, serverMode } from "./config.js";

export function composePlaces({
  provider = createOpenMeteoProvider(),
  mockMode = "",
  now = Date.now,
  timeoutMs = 5000,
  getData = loadData,
} = {}) {
  let selected = provider;
  if (mockMode === "geo-down") {
    selected = {
      search: async () => {
        throw Error("Mock geocoder outage");
      },
    };
  } else if (mockMode === "geo-slow") {
    selected = {
      search: async () => {
        await delay(timeoutMs + 100, undefined, {
          signal: AbortSignal.timeout(timeoutMs),
        });
        return [];
      },
    };
  } else if (mockMode === "geo-empty") {
    selected = { search: async () => [] };
  }
  return { provider: selected, getData, now };
}

export function composeJourneys({
  mockMode = "",
  apiKey = undefined,
  model = undefined,
  fetchImpl = undefined,
  getData = loadData,
} = {}) {
  let estimate;
  if (demoFareModes.has(mockMode)) {
    estimate = async ({ legs }) => demoFares(legs);
  } else if (mockMode === "fares-bad-json") {
    estimate = async ({ legs }) =>
      parseFareText(
        "{",
        legs.map((leg) => leg.id),
      );
  } else if (mockMode === "fares-fail") {
    estimate = async () => {
      throw Error("Mock fare failure");
    };
  } else {
    estimate = (input) => estimateFares({ ...input, apiKey, model, fetchImpl });
  }
  const buildRoutes =
    mockMode === "journeys-empty"
      ? () => []
      : (input) => buildJourneys(input, getData());
  return createJourneyService({
    getData,
    buildRoutes,
    fareProvider: { estimate },
  });
}

export function composeApp(options = {}) {
  const mockMode = options.mockMode ?? process.env.MOCK?.toLowerCase();
  const mockStage = options.mockStage ?? process.env.MOCK_STAGE;
  const model = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
  const getApiKey = () => options.apiKey ?? process.env.GEMINI_API_KEY;
  const getData = options.getData ?? loadData;
  const live = createGeminiPlanner({
    getApiKey,
    model,
    fetchImpl: options.fetch,
  });
  const demo = createDemoPlanner(mockMode, mockStage);
  const planner = {
    generate: async (trip, isOptions) =>
      (await demo.generate(trip, isOptions)) ?? live.generate(trip, isOptions),
  };
  return {
    mode: serverMode(mockMode),
    plan: createPlanningService({ getData, planner }),
    places: composePlaces({ provider: options.geoProvider, mockMode, getData }),
    getJourneys: composeJourneys({
      mockMode,
      apiKey: getApiKey(),
      model,
      fetchImpl: options.fetch,
      getData,
    }),
  };
}
