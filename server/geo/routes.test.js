// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { createOpenMeteoProvider } from "./provider.js";
import { createPlacesRouter, distanceKm } from "./routes.js";
import express from "express";

const servers = [];
async function serve(app) {
  const server = app.listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise((resolve) => server.once("listening", resolve));
  return (path) => fetch("http://127.0.0.1:" + server.address().port + path);
}
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise((resolve) => {
          server.close(resolve);
          server.closeAllConnections();
        }),
    ),
  );
});

const place = {
  id: 1,
  name: "Guwahati",
  country_code: "IN",
  admin1: "Assam",
  admin2: "Kamrup Metropolitan",
  latitude: 26.18,
  longitude: 91.75,
};
it("normalizes, filters and deduplicates provider matches with a shared query cache", async () => {
  const upstream = vi.fn(async () =>
    Response.json({
      results: [
        place,
        place,
        { ...place, id: 2, country_code: "BD" },
        { ...place, id: 3, admin1: "Orissa" },
      ],
    }),
  );
  const get = await serve(
    createApp({
      mockMode: "off",
      geoProvider: createOpenMeteoProvider(upstream),
    }),
  );
  const assam = await get("/api/geo/search?q=Guwahati&state=18").then((r) =>
    r.json(),
  );
  expect(assam.results).toEqual([
    {
      id: 1,
      name: "Guwahati",
      district: "Kamrup Metropolitan",
      state: "Assam",
      stateCode: "18",
      lat: 26.18,
      lon: 91.75,
      featureCode: null,
      population: null,
    },
  ]);
  const odisha = await get("/api/geo/search?q=guwahati&state=21").then((r) =>
    r.json(),
  );
  expect(odisha.results[0].stateCode).toBe("21");
  expect(upstream).toHaveBeenCalledTimes(1);
  expect(upstream.mock.calls[0][0].searchParams.get("countryCode")).toBe("IN");
  expect(upstream.mock.calls[0][0].searchParams.get("count")).toBe("10");
}, 15000);

it("expires empty cached results after 24 hours", async () => {
  let time = 0;
  const search = vi.fn(async () => []);
  const app = express();
  app.use(
    "/api",
    createPlacesRouter({ provider: { search }, now: () => time }),
  );
  const get = await serve(app);
  expect(await get("/api/geo/search?q=Delhi").then((r) => r.json())).toEqual({
    results: [],
  });
  await get("/api/geo/search?q=delhi");
  expect(search).toHaveBeenCalledTimes(1);
  time = 86400000;
  await get("/api/geo/search?q=Delhi");
  expect(search).toHaveBeenCalledTimes(2);
});

it.each(["invalid-json", "invalid-shape", "500", "timeout"])(
  "returns a stable error for upstream %s",
  async (mode) => {
    const upstream = async (_url, options) => {
      if (mode === "invalid-json") return new Response("{");
      if (mode === "invalid-shape")
        return Response.json({ results: "secret upstream data" });
      if (mode === "500")
        return new Response("https://private.example", { status: 500 });
      return new Promise((_resolve, reject) =>
        options.signal.addEventListener("abort", () =>
          reject(Error("private upstream timeout")),
        ),
      );
    };
    const get = await serve(
      createApp({
        mockMode: "off",
        geoProvider: createOpenMeteoProvider(upstream, 20),
      }),
    );
    const response = await get("/api/geo/search?q=Delhi");
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      code: "GEOCODER_UNAVAILABLE",
      error: "Place search is temporarily unavailable.",
    });
  },
);

it.each([
  ["geo-down", 503],
  ["geo-slow", 503],
  ["geo-empty", 200],
])("handles %s without contacting the provider", async (mockMode, status) => {
  const search = vi.fn();
  const app = express();
  app.use(
    "/api",
    createPlacesRouter({ mockMode, timeoutMs: 10, provider: { search } }),
  );
  const get = await serve(app);
  const response = await get("/api/geo/search?q=Delhi");
  expect(response.status).toBe(status);
  expect(search).not.toHaveBeenCalled();
});

it("rejects invalid query strings, state codes and coordinates", async () => {
  const search = vi.fn();
  const get = await serve(
    createApp({ mockMode: "off", geoProvider: { search } }),
  );
  for (const path of [
    "/geo/search?q=a",
    "/geo/search?q=a%3Cscript",
    "/geo/search?q=Delhi&q=Assam",
    "/geo/search?q=Delhi&state=999",
    "/geo/districts?state=999",
    "/hubs/nearby?lat=90&lon=90",
    "/hubs/nearby?lat=2e1&lon=90",
    "/hubs/search?q=Delhi&type=bus",
    "/geo/states?unknown=1",
  ]) {
    const response = await get("/api" + path);
    expect(response.status).toBe(400);
    expect((await response.json()).code).toMatch(/INVALID_QUERY|UNKNOWN_STATE/);
  }
  expect(search).not.toHaveBeenCalled();
});

it("serves bundled states, districts and ordered hub matches", async () => {
  const get = await serve(createApp({ mockMode: "off" }));
  const { states } = await get("/api/geo/states").then((r) => r.json());
  expect(states).toContainEqual({ code: "18", name: "Assam" });
  expect(
    (await get("/api/geo/districts?state=18").then((r) => r.json())).districts
      .length,
  ).toBeGreaterThan(0);
  const nearby = await get("/api/hubs/nearby?lat=26.18&lon=91.75").then((r) =>
    r.json(),
  );
  for (const [rows, radius] of [
    [nearby.airports, 300],
    [nearby.stations, 200],
  ]) {
    const distances = rows.map((row) => row.distanceKm);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(5);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    expect(distances.at(-1)).toBeLessThanOrEqual(radius);
  }
  expect(
    (await get("/api/hubs/search?type=station&q=GHY").then((r) => r.json()))
      .results[0].code,
  ).toBe("GHY");
  expect(
    (await get("/api/hubs/search?type=airport&q=Delhi").then((r) => r.json()))
      .results[0].id,
  ).toBe("DEL");
  expect(distanceKm({ lat: 20, lon: 80 }, { lat: 21, lon: 80 })).toBeCloseTo(
    111.195,
    2,
  );
});

it("applies the shared lookup rate limit to places requests", async () => {
  const get = await serve(createApp({ mockMode: "off" }));
  const responses = await Promise.all(
    Array.from({ length: 30 }, () => get("/api/geo/states")),
  );
  for (const res of responses) expect(res.status).toBe(200);
  expect((await get("/api/hubs/search?type=airport&q=DEL")).status).toBe(429);
}, 15000);
