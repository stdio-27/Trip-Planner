// @vitest-environment node
import { afterEach, expect, it } from "vitest";
import { createApp } from "./app.js";
import { parseOptions } from "../shared/optionsSchema.js";
import { validateGeneratedPlan } from "./planSchema.js";
import { parseJourneys, parseFares } from "../shared/journeys.js";
import { buildJourneys } from "./journeys/engine.js";
import { demoFares, uniqueLegs } from "./journeys/fares.js";
import { loadData } from "./data/index.js";
const trip = {
  origin: {
    stateCode: "7",
    district: "New Delhi",
    lat: 28.61,
    lon: 77.2,
    airportId: "DEL",
    stationCode: "NDLS",
  },
  destination: {
    stateCode: "18",
    placeName: "Guwahati",
    lat: 26.18,
    lon: 91.75,
    airportId: "GAU",
    stationCode: "GHY",
  },
  days: 3,
  currency: "INR",
};
const servers = [];
afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
async function start(options) {
  const server = createApp(options).listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise((resolve) => server.once("listening", resolve));
  return async (endpoint, body) => {
    const response = await fetch(
      "http://127.0.0.1:" + server.address().port + "/api/" + endpoint,
      body
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {},
    );
    expect(response.status).toBe(200);
    return response.json();
  };
}
it.each(["demo", "live"])(
  "preserves planning, place and fare contracts through the %s composition",
  async (mode) => {
    const sample = await start({
      mockMode: "demo",
      geoProvider: { search: async () => [] },
    });
    const options = await sample("options", trip),
      plan = await sample("plan", trip);
    const journeyInput = {
      origin: trip.origin,
      destination: trip.destination,
      travelers: { adults: 1, children: 0 },
      currency: "INR",
    };
    const fareBody = {
      fares: demoFares(uniqueLegs(buildJourneys(journeyInput, loadData()))),
    };
    let calls = 0;
    const api = await start({
      mockMode: mode === "demo" ? "demo" : "",
      apiKey: "contract-test-placeholder",
      geoProvider: { search: async () => [] },
      fetch: async (_url, init) => {
        calls++;
        const prompt = JSON.parse(init.body);
        const schema = prompt.generationConfig?.responseSchema;
        const payload = schema?.properties?.days
          ? plan
          : !schema && !prompt.contents[0].parts[0].text.startsWith("Estimate typical one-way fares")
            ? options
            : fareBody;
        return new Response(
          JSON.stringify({
            candidates: [
              { content: { parts: [{ text: JSON.stringify(payload) }] } },
            ],
          }),
          { status: 200 },
        );
      },
    });
    expect((await api("health")).mode).toBe(mode);
    expect(parseOptions(await api("options", trip)).success).toBe(true);
    expect(validateGeneratedPlan(await api("plan", trip), trip).success).toBe(
      true,
    );
    expect(await api("geo/search?q=Delhi")).toEqual({ results: [] });
    const journeys = await api("journeys", journeyInput);
    expect(parseJourneys(journeys).success).toBe(true);
    expect(parseFares(journeys).success).toBe(true);
    expect(journeys.faresError).toBeNull();
    expect(calls).toBe(mode === "live" ? 3 : 0);
  },
);
