import { validateData } from "../../server/data/index.js";
import fs from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { fetchSources, raw } from "./fetch.js";
import {
  csv,
  fields,
  norm,
  aliases,
  stateResolver,
  inside,
  km,
  schedules,
  minute,
  selectMajors,
  buildGraph,
} from "./core.js";
const out = new URL("../../server/data/", import.meta.url);
const read = (name) => fs.readFile(new URL(name, raw), "utf8").then(JSON.parse);
async function main() {
  const source = await fetchSources();
  const stateRows = csv(new URL("lgd-states.csv", raw)).map(fields),
    districtRows = csv(new URL("lgd-districts.csv", raw)).map(fields);
  const required = (row, key) => {
    if (!row[key]) throw Error(`Missing LGD column/value ${key}`);
    return row[key];
  };
  const states = stateRows
    .map((r) => ({
      code: required(r, "statecode"),
      name: required(r, "statenameinenglish"),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const resolver = stateResolver(states),
    stateCodes = new Set(states.map((x) => x.code));
  if (stateCodes.size !== states.length) throw Error("Duplicate LGD states");
  const districts = Object.fromEntries(states.map((s) => [s.code, []]));
  const districtIds = new Set();
  for (const r of districtRows) {
    const code = required(r, "districtcode"),
      state = required(r, "statecode");
    if (districtIds.has(code) || !stateCodes.has(state))
      throw Error("Invalid LGD district relation");
    districtIds.add(code);
    districts[state].push(required(r, "districtnameinenglish"));
  }
  for (const names of Object.values(districts))
    names.sort((a, b) => a.localeCompare(b));
  const report = {
    sourceCounts: { states: stateRows.length, districts: districtRows.length },
    processedCounts: {
      states: states.length,
      districts: Object.values(districts).reduce((n, a) => n + a.length, 0),
    },
    stationExclusions: {
      missingGeometry: 0,
      outsideBounds: 0,
      foreignLabel: 0,
      duplicate: 0,
    },
    unresolvedLabels: [],
    inferredStates: 0,
    unlabelledStations: 0,
    scheduleRows: 0,
    scheduleUnknownStations: 0,
    scheduleUnknownTrains: 0,
    invalidGraphTimes: 0,
  };
  const stationRaw = await read("stations.json");
  if (stationRaw.type !== "FeatureCollection")
    throw Error("Stations must be GeoJSON FeatureCollection");
  report.sourceCounts.stations = stationRaw.features.length;
  const stationMap = new Map();
  for (const f of stationRaw.features) {
    const p = f.properties,
      c = f.geometry?.coordinates;
    if (!c) {
      report.stationExclusions.missingGeometry++;
      continue;
    }
    if (!inside(c[1], c[0])) {
      report.stationExclusions.outsideBounds++;
      continue;
    }
    if (p.state === "Bangladesh") {
      report.stationExclusions.foreignLabel++;
      continue;
    }
    if (!p.code || !p.name) throw Error("Station missing identity");
    if (stationMap.has(p.code)) {
      report.stationExclusions.duplicate++;
      continue;
    }
    const stateCode = resolver(p.state);
    stationMap.set(p.code, {
      code: p.code,
      name: p.name,
      state: p.state || null,
      stateCode,
      lat: c[1],
      lon: c[0],
      trainCount: 0,
      stateMethod: stateCode ? "source-label" : null,
    });
  }
  const known = [...stationMap.values()].filter((s) => s.stateCode);
  for (const s of stationMap.values())
    if (!s.stateCode) {
      if (s.state)
        report.unresolvedLabels.push({ code: s.code, state: s.state });
      const nearest = known
        .map((k) => ({ k, d: km(s, k) }))
        .filter((x) => x.d <= 50)
        .sort((a, b) => a.d - b.d)[0];
      if (nearest) {
        s.stateCode = nearest.k.stateCode;
        s.state = states.find((x) => x.code === s.stateCode).name;
        s.stateMethod = "nearest-labelled-station";
        s.inferredFrom = nearest.k.code;
        s.inferenceDistanceKm = +nearest.d.toFixed(2);
        report.inferredStates++;
      } else report.unlabelledStations++;
    }
  const trainsRaw = await read("trains.json");
  if (trainsRaw.type !== "FeatureCollection")
    throw Error("Trains must be GeoJSON FeatureCollection");
  const trainIds = new Set(
    trainsRaw.features.map((f) => String(f.properties.number)),
  );
  report.sourceCounts.trains = trainsRaw.features.length;
  const haltTrains = new Map();
  for await (const row of schedules(new URL("schedules.json", raw))) {
    report.scheduleRows++;
    if (!stationMap.has(row.station_code)) {
      report.scheduleUnknownStations++;
      continue;
    }
    if (!trainIds.has(String(row.train_number))) report.scheduleUnknownTrains++;
    const set = haltTrains.get(row.station_code) || new Set();
    set.add(String(row.train_number));
    haltTrains.set(row.station_code, set);
  }
  for (const [code, set] of haltTrains)
    stationMap.get(code).trainCount = set.size;
  haltTrains.clear();
  const stations = [...stationMap.values()].sort((a, b) =>
    a.code.localeCompare(b.code),
  );
  const { threshold, selected } = selectMajors(stations);
  const majorIds = new Set(selected.map((s) => s.code));
  const trainStops = new Map();
  for await (const row of schedules(new URL("schedules.json", raw)))
    if (majorIds.has(row.station_code)) {
      const departure = minute(row.departure, row.day),
        arrival = minute(row.arrival, row.day);
      if (departure === null && arrival === null) continue;
      const list = trainStops.get(String(row.train_number)) || [];
      list.push({
        code: row.station_code,
        departure:
          departure !== null && arrival !== null && departure < arrival
            ? departure + 1440
            : (departure ?? arrival),
        arrival: arrival ?? departure,
        id: row.id,
      });
      trainStops.set(String(row.train_number), list);
    }
  const { edges, invalidTimes } = buildGraph(trainStops, stationMap);
  report.invalidGraphTimes = invalidTimes;
  report.sourceCounts.schedules = report.scheduleRows;
  const regions = new Map(
    csv(new URL("regions.csv", raw))
      .filter((r) => r.iso_country === "IN")
      .map((r) => [r.code, r.name]),
  );
  const airports = [];
  report.airportExclusions = { invalidCoordinates: 0, unmappedState: [] };
  for (const r of csv(new URL("airports.csv", raw)))
    if (
      r.iso_country === "IN" &&
      r.scheduled_service === "yes" &&
      ["large_airport", "medium_airport"].includes(r.type) &&
      /^[A-Z]{3}$/.test(r.iata_code)
    ) {
      const lat = Number(r.latitude_deg),
        lon = Number(r.longitude_deg);
      if (!inside(lat, lon)) {
        report.airportExclusions.invalidCoordinates++;
        continue;
      }
      const stateCode = resolver(regions.get(r.iso_region));
      if (!stateCode)
        report.airportExclusions.unmappedState.push({
          id: r.iata_code,
          region: r.iso_region,
          name: regions.get(r.iso_region),
        });
      airports.push({
        id: r.iata_code,
        name: r.name,
        city: r.municipality,
        stateCode,
        lat,
        lon,
      });
    }
  airports.sort((a, b) => a.id.localeCompare(b.id));
  const airportIds = new Set(airports.map((a) => a.id));
  const historicalIds = new Map(
    csv(new URL("airports.dat", raw), false).map((r) => [r[0], r[4]]),
  );
  const routeKeys = new Set();
  for (const r of csv(new URL("routes.dat", raw), false)) {
    const a = airportIds.has(r[2]) ? r[2] : historicalIds.get(r[3]),
      b = airportIds.has(r[4]) ? r[4] : historicalIds.get(r[5]);
    if (airportIds.has(a) && airportIds.has(b) && r[7] === "0")
      routeKeys.add(a + "|" + b);
  }
  const flightRoutes = [...routeKeys].sort().map((key) => {
    const [a, b] = key.split("|");
    return { a, b, evidence: "route-hint", dataYear: 2014 };
  });
  const linked = new Set(edges.flatMap((e) => [e.a, e.b]));
  report.threshold = threshold;
  report.formula =
    "trainCount >= T, or JN/JUNCTION/CENTRAL/TERMINUS in name and trainCount >= T/2; choose integer T minimizing distance to 400, then include the three busiest evidenced stations per labelled state (or all if fewer), to reduce suburban-volume bias.";
  report.perState = states.map((s) => ({
    ...s,
    districts: districts[s.code].length,
    stations: stations.filter((x) => x.stateCode === s.code).length,
    majorJunctions: selected.filter((x) => x.stateCode === s.code).length,
    airports: airports.filter((x) => x.stateCode === s.code).length,
  }));
  report.unassignedMajorJunctions = selected
    .filter((s) => !s.stateCode)
    .map((s) => ({ code: s.code, name: s.name }));
  report.isolatedJunctions = selected
    .filter((s) => !linked.has(s.code))
    .map(({ code, name, stateCode }) => ({ code, name, stateCode }));
  report.missingStateCoverage = report.perState
    .filter((s) => !s.majorJunctions)
    .map((s) => ({
      code: s.code,
      name: s.name,
      reason: s.stations
        ? "No halting train evidence in retained snapshot"
        : "No retained station has a matching state label in the 2016 snapshot; not evidence of absent current rail service.",
    }));
  report.samples = {
    stations: Object.fromEntries(
      ["GHY", "HWH", "NDLS", "SCL"].map((id) => [
        id,
        stationMap.has(id)
          ? { present: true, major: majorIds.has(id) }
          : { present: false },
      ]),
    ),
    airports: Object.fromEntries(
      ["GAU", "CCU", "DEL", "IXS"].map((id) => [
        id,
        { present: airportIds.has(id) },
      ]),
    ),
  };
  Object.assign(report.processedCounts, {
    stations: stations.length,
    majorJunctions: selected.length,
    airports: airports.length,
    junctionEdges: edges.length,
    flightRoutes: flightRoutes.length,
  });
  await fs.mkdir(out, { recursive: true });
  const graph = gzipSync(Buffer.from(JSON.stringify(edges)), { level: 9 });
  if (graph.length > 3 * 1024 * 1024)
    throw Error("Compressed graph exceeds 3 MiB");
  report.graphBytes = graph.length;
  const outputs = {
    states,
    districts,
    airports,
    stations,
    majorJunctions: selected,
    flightRoutes,
    stateAliases: aliases,
    report,
    provenance: {
      sources: source,
      notes: [
        "Rail data is a 2016 snapshot. Source-state labels may predate Telangana/Ladakh or merged UT boundaries.",
        "Graph edges are directional. Times use schedule day plus arrival/departure; distances are straight-line estimates, not rail-route distances.",
        "OpenFlights routes are a June 2014 snapshot, never availability.",
      ],
    },
  };
  validateData({ ...outputs, junctionGraph: edges });
  for (const [name, data] of Object.entries(outputs))
    await fs.writeFile(
      new URL(name + ".json", out),
      JSON.stringify(data, null, name === "stations" ? 0 : 2) + "\n",
    );
  await fs.writeFile(new URL("junctionGraph.json.gz", out), graph);
  console.log(JSON.stringify(report, null, 2));
}
main().catch((e) => {
  console.error(e.stack);
  process.exitCode = 1;
});
