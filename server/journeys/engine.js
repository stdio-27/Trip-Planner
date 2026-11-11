import { createHash } from "node:crypto";
import { distanceKm } from "../../shared/distance.js";
import { snapshotAvailability } from "../availability/provider.js";
import { buffers, flightHubs, roadFactor, speeds } from "./constants.js";

const graphIndexes = new WeakMap();
const round = (value) => Math.round(value * 100) / 100;
const stableId = (values) =>
  createHash("sha256")
    .update(JSON.stringify(values))
    .digest("hex")
    .slice(0, 24);
const point = (kind, id, name, row) => ({
  kind,
  id,
  name,
  lat: row.lat,
  lon: row.lon,
});

function indexes(data) {
  if (graphIndexes.has(data)) return graphIndexes.get(data);
  const rail = new Map();
  for (const edge of data.junctionGraph) {
    if (!rail.has(edge.a)) rail.set(edge.a, new Map());
    rail.get(edge.a).set(edge.b, edge);
  }
  const flights = new Set(
    data.flightRoutes.map((edge) => edge.a + "|" + edge.b),
  );
  const result = { rail, flights };
  graphIndexes.set(data, result);
  return result;
}

function leg(mode, from, to, km, minutes, bufferMin, serviceCount, note) {
  const availability = snapshotAvailability(mode);
  return {
    id: stableId([mode, from.id, to.id, bufferMin]),
    mode,
    from,
    to,
    distanceKm: round(km),
    durationMin: Math.max(1, Math.ceil(minutes)) + bufferMin,
    bufferMin,
    evidence:
      availability.level === "unverified" ? "estimate" : availability.level,
    serviceCount,
    note,
    availability,
  };
}

function road(mode, from, to) {
  const km = distanceKm(from, to) * roadFactor;
  return leg(
    mode,
    from,
    to,
    km,
    (km * 60) / speeds[mode],
    0,
    null,
    "Road distance and driving time are approximate.",
  );
}

function connector(mode, from, to) {
  return distanceKm(from, to) > 5 ? [road(mode, from, to)] : [];
}

function closest(rows, place, radius) {
  return rows
    .map((row) => ({ row, km: distanceKm(row, place) }))
    .filter((item) => item.km <= radius)
    .sort(
      (a, b) =>
        a.km - b.km ||
        (a.row.code ?? a.row.id).localeCompare(b.row.code ?? b.row.id),
    )
    .map((item) => item.row);
}

function railJourneys(data, rail, origin, destination, from, to) {
  const start = data.junctionsByCode.get(origin.stationCode);
  if (!start) return [];
  const arrival = data.junctionsByCode.get(destination.stationCode);
  const nearby = closest(data.majorJunctions, to, 500);
  // A missing arrival station can use a railhead beyond the nearby-search radius.
  const ends = arrival
    ? [arrival]
    : nearby.some((row) => distanceKm(row, to) <= 200)
      ? []
      : nearby;
  const firstLeg = point("station", start.code, start.name, start);
  const firstMile = connector("cab", from, firstLeg);
  const outgoing = rail.get(start.code);
  if (!outgoing) return [];
  const paths = [];
  for (const end of ends) {
    if (end.code === start.code) continue;
    const direct = outgoing.get(end.code);
    const transfers = [];
    if (direct) transfers.push([direct]);
    for (const [via, first] of outgoing) {
      if (via === end.code) continue;
      const second = rail.get(via)?.get(end.code);
      if (second) transfers.push([first, second]);
    }
    const lastStop = point("station", end.code, end.name, end);
    const lastMile = connector("bus", lastStop, to);
    for (const edges of transfers) {
      const running = edges.reduce(
        (sum, edge) => sum + Math.ceil(edge.medianRunMinutes),
        0,
      );
      const transfer = edges.length > 1 ? buffers.railChange : 0;
      const access = firstMile.length ? buffers.roadToRail : 0;
      paths.push({
        edges,
        lastMile,
        duration:
          running + transfer + access + total(firstMile) + total(lastMile),
      });
    }
  }
  return paths
    .sort((a, b) => a.duration - b.duration)
    .slice(0, 2)
    .map(({ edges, lastMile }) => {
      const trains = edges.map((edge, index) => {
        const a = data.junctionsByCode.get(edge.a);
        const b = data.junctionsByCode.get(edge.b);
        const buffer = index
          ? buffers.railChange
          : firstMile.length
            ? buffers.roadToRail
            : 0;
        return leg(
          "train",
          point("station", a.code, a.name, a),
          point("station", b.code, b.name, b),
          edge.distanceKm,
          edge.medianRunMinutes,
          buffer,
          edge.trains,
          "Historical timetable match. Distance is straight-line.",
        );
      });
      return [...firstMile, ...trains, ...lastMile];
    });
}

function flightJourneys(data, routes, origin, destination, from, to) {
  const start = data.airportsById.get(origin.airportId);
  const end = data.airportsById.get(destination.airportId);
  if (!start || !end) return [];
  const alternate = (selected, place) =>
    closest(data.airports, place, 300).find((row) => row.id !== selected.id);
  const starts = [start, alternate(start, from)].filter(Boolean);
  const ends = [end, alternate(end, to)].filter(Boolean);
  const paths = [];
  const has = (a, b) => routes.has(a.id + "|" + b.id);
  for (const a of starts)
    for (const b of ends) {
      if (a.id === b.id) continue;
      const sequences = has(a, b)
        ? [[a, b]]
        : flightHubs
            .map((id) => data.airportsById.get(id))
            .filter(
              (hub) =>
                hub &&
                hub.id !== a.id &&
                hub.id !== b.id &&
                has(a, hub) &&
                has(hub, b),
            )
            .map((hub) => [a, hub, b]);
      for (const sequence of sequences) {
        const hubs = sequence.map((row) =>
          point("airport", row.id, row.name, row),
        );
        const flights = hubs.slice(1).map((arrival, index) => {
          const departure = hubs[index];
          const km = distanceKm(departure, arrival);
          return leg(
            "flight",
            departure,
            arrival,
            km,
            (km * 60) / speeds.flight,
            buffers.airport,
            null,
            "Historical route hint. Verify current flights before booking.",
          );
        });
        paths.push([
          ...connector("cab", from, hubs[0]),
          ...flights,
          ...connector("cab", hubs.at(-1), to),
        ]);
      }
    }
  return paths.sort((a, b) => total(a) - total(b));
}

const total = (legs) => legs.reduce((sum, item) => sum + item.durationMin, 0);
const modeNames = { train: "Train", flight: "Flight", bus: "Bus", cab: "Cab" };
const mainMode = (legs) =>
  legs.some((item) => item.mode === "flight")
    ? "flight"
    : legs.some((item) => item.mode === "train")
      ? "train"
      : legs[0].mode;

// Rank low-cost candidates by a mode heuristic. The fare provider supplies the actual estimates separately.
const costWeight = { train: 1, flight: 6, bus: 1.2, cab: 4 };
const costRank = (journey) =>
  journey.legs.reduce(
    (sum, item) => sum + item.distanceKm * costWeight[item.mode],
    0,
  );

export function buildJourneys({ origin, destination }, data) {
  const from = point(
    "place",
    "origin:" + origin.lat + "," + origin.lon,
    origin.district,
    origin,
  );
  const to = point(
    "place",
    "destination:" + destination.lat + "," + destination.lon,
    destination.placeName,
    destination,
  );
  const km = distanceKm(from, to);
  const roadPaths =
    km <= 500 ? [[road("bus", from, to)], [road("cab", from, to)]] : [];
  const { rail, flights } = indexes(data);
  const paths =
    km < 30
      ? roadPaths
      : [
          ...roadPaths,
          ...railJourneys(data, rail, origin, destination, from, to),
          ...flightJourneys(data, flights, origin, destination, from, to),
        ];
  const unique = new Map();
  for (const legs of paths) {
    if (!legs.length || legs.length > 4) continue;
    const id = stableId(legs.map((item) => item.id));
    if (unique.has(id)) continue;
    const modes = [...new Set(legs.map((item) => item.mode))];
    unique.set(id, {
      id,
      label: modes.map((mode) => modeNames[mode]).join(" + "),
      legs,
      totalDurationMin: total(legs),
      changes: legs.length - 1,
      modes,
    });
  }
  const ordered = [...unique.values()].sort(
    (a, b) => a.totalDurationMin - b.totalDurationMin,
  );
  if (!ordered.length) return [];
  const fastest = ordered[0].totalDurationMin;
  const distinct = new Set();
  const eligible = ordered.filter((journey) => {
    const mode = mainMode(journey.legs);
    if (journey.totalDurationMin > 2 * fastest && distinct.has(mode))
      return false;
    distinct.add(mode);
    return true;
  });
  const cheapest = [...eligible].sort((a, b) => costRank(a) - costRank(b))[0];
  const comfortable = [...eligible].sort(
    (a, b) => a.changes - b.changes || a.totalDurationMin - b.totalDurationMin,
  )[0];
  const byMode = [...distinct].map((mode) =>
    eligible.find((journey) => mainMode(journey.legs) === mode),
  );
  return [
    ...new Set([eligible[0], cheapest, comfortable, ...byMode, ...eligible]),
  ].slice(0, 5);
}
