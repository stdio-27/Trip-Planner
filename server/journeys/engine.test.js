// @vitest-environment node
import { expect, it } from "vitest";
import { buildJourneys } from "./engine.js";
import { normalizeFares } from "./fares.js";
import { NoLiveProvider } from "../availability/provider.js";
import { loadData } from "../data/index.js";

const station = (code, lat, lon = 77) => ({ code, name: code, lat, lon });
const airport = (id, lat) => ({ id, name: id, lat, lon: 77 });
const edge = (a, b, minutes = 100) => ({
  a,
  b,
  medianRunMinutes: minutes,
  distanceKm: 200,
  trains: 2,
});
function data(
  junctionGraph = [],
  flightRoutes = [],
  stations = [
    station("A", 20),
    station("B", 23),
    station("C", 26),
    station("D", 29),
  ],
) {
  const airports = [airport("AAA", 20), airport("DEL", 24), airport("BBB", 29)];
  return {
    majorJunctions: stations,
    junctionsByCode: new Map(stations.map((row) => [row.code, row])),
    airports,
    airportsById: new Map(airports.map((row) => [row.id, row])),
    junctionGraph,
    flightRoutes,
  };
}
const trip = {
  origin: {
    district: "Start",
    lat: 20,
    lon: 77,
    stationCode: "A",
    airportId: null,
  },
  destination: {
    placeName: "End",
    lat: 29,
    lon: 77,
    stationCode: "D",
    airportId: null,
  },
};

it("finds direct and one-change routes in duration order and includes rail buffers", () => {
  const routes = buildJourneys(
    trip,
    data([edge("A", "D", 300), edge("A", "B"), edge("B", "D")]),
  );
  expect(routes.map((row) => row.totalDurationMin)).toEqual([260, 300]);
  expect(routes[0].legs.map((leg) => leg.to.id)).toEqual(["B", "D"]);
  expect(routes[0].legs[1].bufferMin).toBe(60);
  expect(routes[0].legs[0].availability).toMatchObject({
    level: "scheduled",
    dataYear: 2016,
  });
  expect(routes[1].changes).toBe(0);
});
it("excludes routes needing two changes or a reversed directional edge", () => {
  expect(
    buildJourneys(trip, data([edge("A", "B"), edge("B", "C"), edge("C", "D")])),
  ).toEqual([]);
  expect(buildJourneys(trip, data([edge("D", "A")]))).toEqual([]);
});
it("restricts trips under 30 km to road modes", () => {
  const routes = buildJourneys(
    { ...trip, destination: { ...trip.destination, lat: 20.1 } },
    data([edge("A", "D")]),
  );
  expect(routes.map((row) => row.modes[0])).toEqual(["cab", "bus"]);
  expect(routes.every((row) => row.legs[0].evidence === "estimate")).toBe(true);
});
it("adds a road leg from a reachable railhead when no station is nearby", () => {
  const routes = buildJourneys(
    { ...trip, destination: { ...trip.destination, stationCode: null } },
    data([edge("A", "C")], [], [station("A", 20), station("C", 26)]),
  );
  expect(routes[0].modes).toEqual(["train", "bus"]);
  expect(routes[0].legs[1].to.name).toBe("End");
});
it("uses a one-stop flight only when both historical route hints exist", () => {
  const flightTrip = {
    origin: { ...trip.origin, stationCode: null, airportId: "AAA" },
    destination: { ...trip.destination, stationCode: null, airportId: "BBB" },
  };
  const routes = buildJourneys(
    flightTrip,
    data(
      [],
      [
        { a: "AAA", b: "DEL" },
        { a: "DEL", b: "BBB" },
      ],
    ),
  );
  expect(routes[0].legs.map((leg) => leg.to.id)).toEqual(["DEL", "BBB"]);
  expect(
    routes[0].legs.every(
      (leg) => leg.bufferMin === 120 && leg.evidence === "route-hint",
    ),
  ).toBe(true);
  expect(buildJourneys(flightTrip, data([], [{ a: "AAA", b: "DEL" }]))).toEqual(
    [],
  );
});
it("keeps diverse bounded journeys for a real north-east trip", () => {
  const snapshot = loadData();
  const input = {
    origin: {
      district: "Kamrup Metropolitan",
      lat: 26.18,
      lon: 91.75,
      airportId: "GAU",
      stationCode: "GHY",
    },
    destination: {
      placeName: "Kolkata",
      lat: 22.57,
      lon: 88.36,
      airportId: "CCU",
      stationCode: "HWH",
    },
  };
  const routes = buildJourneys(input, snapshot);
  expect(routes.some((row) => row.modes.includes("flight"))).toBe(true);
  expect(routes.some((row) => row.modes.includes("train"))).toBe(true);
  expect(new Set(routes.map((row) => row.id)).size).toBe(routes.length);
  expect(routes.length).toBeLessThanOrEqual(5);
  for (const row of routes) {
    expect(row.legs.length).toBeLessThanOrEqual(4);
    expect(row.totalDurationMin).toBe(
      row.legs.reduce((sum, leg) => sum + leg.durationMin, 0),
    );
  }
  expect(buildJourneys(input, snapshot).map((row) => row.id)).toEqual(
    routes.map((row) => row.id),
  );
});
it("normalizes tier order, ignores extra keys and rejects missing or nonfinite fares", async () => {
  const fare = { basic: 30, standard: 10, premium: 20, pricing: "perPerson" };
  expect(normalizeFares({ fares: { a: fare, ignored: "bad" } }, ["a"])).toEqual(
    {
      a: { basic: 10, standard: 20, premium: 30, pricing: "perPerson" },
    },
  );
  expect(() => normalizeFares({ fares: { a: fare } }, ["a", "b"])).toThrow();
  expect(() =>
    normalizeFares({ fares: { a: { ...fare, basic: Infinity } } }, ["a"]),
  ).toThrow();
  expect((await new NoLiveProvider().check()).level).toBe("unverified");
});
