import { Router } from "express";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import { loadData } from "../data/index.js";
import { createOpenMeteoProvider } from "./provider.js";

const query = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .regex(/^[\p{L}\p{M}\p{N} .,'-]+$/u)
  .transform((value) => value.replace(/ +/g, " "));
const state = z.string().regex(/^\d{1,3}$/);
const coordinate = (min, max) =>
  z
    .string()
    .max(30)
    .regex(/^-?\d+(?:\.\d+)?$/)
    .transform(Number)
    .pipe(z.number().min(min).max(max));
const schemas = {
  states: z.strictObject({}),
  districts: z.strictObject({ state }),
  places: z.strictObject({ q: query, state: state.optional() }),
  nearby: z.strictObject({ lat: coordinate(6, 38), lon: coordinate(68, 98) }),
  hubs: z.strictObject({ type: z.enum(["airport", "station"]), q: query }),
};

export function distanceKm(a, b) {
  const rad = (n) => (n * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) *
      Math.cos(rad(b.lat)) *
      Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function normalizeState(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function createPlacesRouter({
  provider = createOpenMeteoProvider(),
  mockMode = "",
  now = Date.now,
  timeoutMs = 5000,
} = {}) {
  const router = Router();
  const cache = new Map();

  function validate(req, res, schema) {
    const parsed = schema.safeParse(req.query);
    if (parsed.success) return parsed.data;
    res
      .status(400)
      .json({ code: "INVALID_QUERY", error: "Invalid query parameters." });
  }

  function knownState(res, code, data) {
    if (data.statesByCode.has(code)) return true;
    res
      .status(400)
      .json({ code: "UNKNOWN_STATE", error: "Unknown state code." });
    return false;
  }

  router.get("/geo/states", (req, res) => {
    if (!validate(req, res, schemas.states)) return;
    res.json({ states: loadData().states });
  });

  router.get("/geo/districts", (req, res) => {
    const input = validate(req, res, schemas.districts);
    if (!input) return;
    const data = loadData();
    if (!knownState(res, input.state, data)) return;
    res.json({ districts: data.districts[input.state] });
  });

  router.get("/geo/search", async (req, res) => {
    const input = validate(req, res, schemas.places);
    if (!input) return;
    const data = loadData();
    if (input.state && !knownState(res, input.state, data)) return;
    const key = input.q.toLowerCase();
    try {
      let entry = cache.get(key);
      cache.delete(key);
      if (!entry || entry.expires <= now()) {
        if (mockMode === "geo-down") throw Error("Mock geocoder outage");
        if (mockMode === "geo-slow") {
          await delay(timeoutMs + 100, undefined, {
            signal: AbortSignal.timeout(timeoutMs),
          });
        }
        const rows =
          mockMode === "geo-empty" ? [] : await provider.search(input.q);
        entry = { rows, expires: now() + 86400000 };
      }
      cache.set(key, entry);
      if (cache.size > 500) cache.delete(cache.keys().next().value);
      const states = new Map(
        data.states.map((row) => [normalizeState(row.name), row]),
      );
      const seen = new Set();
      const results = entry.rows.flatMap((row) => {
        const key = normalizeState(row.admin1 ?? "");
        const region = states.get(data.stateAliases[key] ?? key);
        if (
          row.country_code !== "IN" ||
          !region ||
          (input.state && region.code !== input.state) ||
          seen.has(row.id)
        )
          return [];
        seen.add(row.id);
        return [
          {
            id: row.id,
            name: row.name,
            district: row.admin2 ?? null,
            state: region.name,
            stateCode: region.code,
            lat: row.latitude,
            lon: row.longitude,
            featureCode: row.feature_code ?? null,
            population: row.population ?? null,
          },
        ];
      });
      res.json({ results });
    } catch {
      res.status(503).json({
        code: "GEOCODER_UNAVAILABLE",
        error: "Place search is temporarily unavailable.",
      });
    }
  });

  router.get("/hubs/nearby", (req, res) => {
    const input = validate(req, res, schemas.nearby);
    if (!input) return;
    const data = loadData();
    const nearby = (rows, radius) =>
      rows
        .map((row) => ({ ...row, distanceKm: distanceKm(input, row) }))
        .filter((row) => row.distanceKm <= radius)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 5)
        .map((row) => ({
          ...row,
          distanceKm: Number(row.distanceKm.toFixed(2)),
        }));
    const airports = nearby(data.airports, 300);
    const stations = nearby(data.majorJunctions, 200);
    res.json({
      airports,
      stations,
      notes: [
        ...(!airports.length ? ["No airport in range."] : []),
        ...(!stations.length ? ["No major junction in range."] : []),
      ],
    });
  });

  router.get("/hubs/search", (req, res) => {
    const input = validate(req, res, schemas.hubs);
    if (!input) return;
    const data = loadData();
    const rows = input.type === "airport" ? data.airports : data.majorJunctions;
    const term = input.q.toLowerCase();
    const matches = rows.flatMap((row) => {
      const code = (row.id ?? row.code).toLowerCase();
      const fields = [
        code,
        row.name.toLowerCase(),
        row.city?.toLowerCase() ?? "",
      ];
      if (!fields.some((field) => field.includes(term))) return [];
      return [
        {
          row,
          rank:
            code === term
              ? 0
              : fields.some((field) => field.startsWith(term))
                ? 1
                : 2,
        },
      ];
    });
    matches.sort(
      (a, b) => a.rank - b.rank || a.row.name.localeCompare(b.row.name),
    );
    res.json({ results: matches.slice(0, 8).map((match) => match.row) });
  });

  return router;
}
