// @vitest-environment node
import { expect, it } from "vitest";
import { mkdtempSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { loadData, readData, validateData } from "./index.js";
it("loads once, indexes real data, compares source counts, and reports examples", () => {
  const d = loadData();
  expect(loadData()).toBe(d);
  expect(d.states.length).toBe(d.report.sourceCounts.states);
  expect(Object.values(d.districts).flat().length).toBe(
    d.report.sourceCounts.districts,
  );
  for (const id of ["GHY", "HWH", "NDLS", "SCL"])
    expect(d.report.samples.stations[id].present).toBe(
      d.stationsByCode.has(id),
    );
  for (const id of ["GAU", "CCU", "DEL", "IXS"])
    expect(d.report.samples.airports[id].present).toBe(d.airportsById.has(id));
  expect(d.stationPrefixes.get("ghy").size).toBeGreaterThan(0);
  expect(d.report.graphBytes).toBeLessThan(3 * 1024 * 1024);
});
it("fails clearly for missing runtime files", () => {
  const dir = mkdtempSync(join(tmpdir(), "trip-missing-"));
  try {
    expect(() => readData(pathToFileURL(dir + "/"))).toThrow(
      "run npm run data:build",
    );
  } finally {
    rmdirSync(dir);
  }
});
it("rejects duplicate ids, invalid coordinates, bad graph endpoints and count drift", () => {
  const d = loadData();
  for (const change of [
    { airports: [...d.airports, d.airports[0]] },
    { stations: [{ ...d.stations[0], lat: 0 }] },
    {
      junctionGraph: [
        {
          a: "MISSING",
          b: "NO",
          trains: 1,
          medianRunMinutes: 10,
          distanceKm: 20,
        },
      ],
    },
    {
      report: {
        ...d.report,
        sourceCounts: { ...d.report.sourceCounts, states: -1 },
      },
    },
  ])
    expect(() => validateData({ ...d, ...change })).toThrow();
});
