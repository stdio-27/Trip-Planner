import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import { z } from "zod";
const point = {
  lat: z.number().min(6).max(38),
  lon: z.number().min(68).max(98),
};
const state = z.object({ code: z.string().min(1), name: z.string().min(1) });
const station = z
  .object({
    code: z.string().min(1),
    name: z.string().min(1),
    stateCode: z.string().nullable(),
    trainCount: z.number().int().nonnegative(),
    ...point,
  })
  .passthrough();
const airport = z.object({
  id: z.string().regex(/^[A-Z]{3}$/),
  name: z.string().min(1),
  city: z.string(),
  stateCode: z.string().nullable(),
  ...point,
});
const edge = z.object({
  a: z.string(),
  b: z.string(),
  trains: z.number().int().positive(),
  medianRunMinutes: z.number().positive(),
  distanceKm: z.number().nonnegative(),
});
export function validateData(data) {
  z.array(state).min(1).parse(data.states);
  z.array(station).min(1).parse(data.stations);
  z.array(station).min(1).parse(data.majorJunctions);
  z.array(airport).min(1).parse(data.airports);
  z.array(edge).parse(data.junctionGraph);
  const unique = (rows, key) => {
    const ids = new Set(rows.map((r) => r[key]));
    if (ids.size !== rows.length) throw Error(`Duplicate ${key}`);
    return ids;
  };
  const states = unique(data.states, "code"),
    stations = unique(data.stations, "code"),
    majors = unique(data.majorJunctions, "code"),
    airports = unique(data.airports, "id");
  for (const rows of [data.stations, data.airports])
    for (const r of rows)
      if (r.stateCode !== null && !states.has(r.stateCode))
        throw Error("Unknown state reference");
  for (const s of data.majorJunctions) {
    if (!stations.has(s.code)) throw Error("Missing parent station");
    const parent = data.stations.find((p) => p.code === s.code);
    if (
      parent.lat !== s.lat ||
      parent.lon !== s.lon ||
      parent.trainCount !== s.trainCount
    )
      throw Error("Junction differs from parent station");
  }
  const pairs = new Set();
  for (const e of data.junctionGraph) {
    const key = e.a + "|" + e.b;
    if (!majors.has(e.a) || !majors.has(e.b) || e.a === e.b || pairs.has(key))
      throw Error("Invalid graph endpoint/pair");
    pairs.add(key);
  }
  z.record(z.string(), z.array(z.string().min(1))).parse(data.districts);
  let districts = 0;
  for (const [code, names] of Object.entries(data.districts)) {
    if (!states.has(code) || new Set(names).size !== names.length)
      throw Error("Invalid district state/duplicate");
    districts += names.length;
  }
  if (
    Object.keys(data.districts).length !== states.size ||
    data.report.sourceCounts.states !== states.size ||
    data.report.sourceCounts.districts !== districts
  )
    throw Error("LGD source/output count mismatch");
  const flightPairs = new Set();
  for (const e of data.flightRoutes) {
    if (
      !airports.has(e.a) ||
      !airports.has(e.b) ||
      e.dataYear !== 2014 ||
      e.evidence !== "route-hint" ||
      flightPairs.has(e.a + "|" + e.b)
    )
      throw Error("Invalid flight hint");
    flightPairs.add(e.a + "|" + e.b);
  }
  z.record(z.string(), z.string()).parse(data.stateAliases);
  if (!data.provenance.sources || !Object.keys(data.provenance.sources).length)
    throw Error("Missing dataset provenance");
  return data;
}
export function readData(directory = new URL("./", import.meta.url)) {
  const read = (name) => {
    try {
      return JSON.parse(
        fs.readFileSync(new URL(name + ".json", directory), "utf8"),
      );
    } catch (error) {
      throw Error(
        `Missing or invalid processed data ${name}; run npm run data:build.`,
        { cause: error },
      );
    }
  };
  let graph;
  try {
    graph = JSON.parse(
      gunzipSync(
        fs.readFileSync(new URL("junctionGraph.json.gz", directory)),
      ).toString("utf8"),
    );
  } catch (error) {
    throw Error("Missing or invalid junction graph; run npm run data:build.", {
      cause: error,
    });
  }
  return validateData({
    states: read("states"),
    districts: read("districts"),
    stations: read("stations"),
    airports: read("airports"),
    majorJunctions: read("majorJunctions"),
    flightRoutes: read("flightRoutes"),
    stateAliases: read("stateAliases"),
    report: read("report"),
    provenance: read("provenance"),
    junctionGraph: graph,
  });
}
let cached;
/** Load once; no network access occurs at runtime. */
export function loadData() {
  if (cached) return cached;
  const data = readData();
  const prefixIndex = (rows) => {
    const map = new Map();
    for (const row of rows)
      for (const word of `${row.code || row.id} ${row.name} ${row.city || ""}`
        .toLowerCase()
        .split(/\s+/))
        for (let n = 1; n <= Math.min(word.length, 5); n++) {
          const key = word.slice(0, n),
            set = map.get(key) || new Set();
          set.add(row);
          map.set(key, set);
        }
    return map;
  };
  cached = {
    ...data,
    statesByCode: new Map(data.states.map((s) => [s.code, s])),
    stationsByCode: new Map(data.stations.map((s) => [s.code, s])),
    airportsById: new Map(data.airports.map((a) => [a.id, a])),
    junctionsByCode: new Map(data.majorJunctions.map((s) => [s.code, s])),
    stationPrefixes: prefixIndex(data.majorJunctions),
    airportPrefixes: prefixIndex(data.airports),
  };
  return cached;
}
