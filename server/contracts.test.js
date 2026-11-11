// @vitest-environment node
import { afterEach, expect, it } from "vitest";
import { z } from "zod";
import { createApp } from "./app.js";
import { parseJourneys, parseFares } from "../shared/journeys.js";
import { parseOptions } from "../shared/optionsSchema.js";
import { validateGeneratedPlan } from "./planSchema.js";
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
let server;
afterEach(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
it("characterizes every successful demo API response at the HTTP boundary", async () => {
  server = createApp({
    mockMode: "demo",
    geoProvider: { search: async () => [] },
  }).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = "http://127.0.0.1:" + server.address().port + "/api/";
  const get = async (endpoint) => {
    const r = await fetch(base + endpoint);
    expect(r.status).toBe(200);
    return r.json();
  };
  const post = async (endpoint, body) => {
    const r = await fetch(base + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    expect(r.status).toBe(200);
    return r.json();
  };
  expect(
    z
      .object({ ok: z.literal(true), mode: z.enum(["demo", "live"]) })
      .safeParse(await get("health")).success,
  ).toBe(true);
  expect(
    z
      .object({
        states: z.array(z.object({ code: z.string(), name: z.string() })),
      })
      .safeParse(await get("geo/states")).success,
  ).toBe(true);
  expect(
    z
      .object({ districts: z.array(z.string()) })
      .safeParse(await get("geo/districts?state=7")).success,
  ).toBe(true);
  expect(await get("geo/search?q=Delhi")).toEqual({ results: [] });
  const nearby = await get("hubs/nearby?lat=28.61&lon=77.2");
  expect(
    Array.isArray(nearby.airports) &&
      Array.isArray(nearby.stations) &&
      Array.isArray(nearby.notes),
  ).toBe(true);
  expect((await get("hubs/search?type=airport&q=DEL")).results[0].id).toBe(
    "DEL",
  );
  const input = {
    origin: trip.origin,
    destination: trip.destination,
    travelers: { adults: 1, children: 0 },
    currency: "INR",
  };
  expect(parseJourneys(await post("journeys/structure", input)).success).toBe(
    true,
  );
  expect(parseFares(await post("journeys/fares", input)).success).toBe(true);
  const combined = await post("journeys", input);
  expect(parseJourneys(combined).success && parseFares(combined).success).toBe(
    true,
  );
  expect(parseOptions(await post("options", trip)).success).toBe(true);
  expect(validateGeneratedPlan(await post("plan", trip), trip).success).toBe(
    true,
  );
});
