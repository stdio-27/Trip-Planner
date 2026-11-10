// @vitest-environment node
import { expect, it } from "vitest";
import { mkdtempSync, writeFileSync, rmdirSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  schedules,
  km,
  inside,
  stateResolver,
  selectMajors,
  buildGraph,
  minute,
} from "./core.js";
it("streams the flat schedule array record by record and rejects truncation", async () => {
  const dir = mkdtempSync(join(tmpdir(), "trip-data-"));
  try {
    const file = join(dir, "schedule.json");
    writeFileSync(
      file,
      JSON.stringify([{ station_code: "A" }, { station_code: "B" }]),
    );
    const rows = [];
    for await (const row of schedules(file)) rows.push(row);
    expect(rows.map((r) => r.station_code)).toEqual(["A", "B"]);
    writeFileSync(file, '[{"x":');
    await expect(
      (async () => {
        for await (const row of schedules(file)) void row;
      })(),
    ).rejects.toThrow();
  } finally {
    unlinkSync(join(dir, "schedule.json"));
    rmdirSync(dir);
  }
});
it("checks bounds and great-circle distances", () => {
  expect(inside(26, 91)).toBe(true);
  expect(inside(NaN, 91)).toBe(false);
  expect(inside(0, 0)).toBe(false);
  expect(km({ lat: 20, lon: 80 }, { lat: 21, lon: 80 })).toBeCloseTo(
    111.195,
    1,
  );
});
it("maps legacy state names without fixing counts", () => {
  const resolve = stateResolver([
    { name: "Odisha", code: "21" },
    { name: "Delhi", code: "7" },
  ]);
  expect(resolve("Orissa")).toBe("21");
  expect(resolve("Delhi (National Capital Territory)")).toBe("7");
  expect(resolve("Unknown")).toBeNull();
});
it("covers small evidenced states without inventing missing states", () => {
  const rows = [
    { code: "A", name: "A", stateCode: "one", trainCount: 200 },
    { code: "B", name: "B", stateCode: "two", trainCount: 1 },
  ];
  const result = selectMajors(rows);
  expect(result.selected.some((s) => s.code === "B")).toBe(true);
});
it("builds directed train edges with distinct trains and median elapsed minutes", () => {
  const points = new Map([
    ["A", { lat: 20, lon: 80 }],
    ["B", { lat: 21, lon: 80 }],
    ["C", { lat: 22, lon: 80 }],
  ]);
  const stop = (code, arrival, departure) => ({
    code,
    arrival,
    departure,
    id: arrival,
  });
  const result = buildGraph(
    new Map([
      ["one", [stop("A", 0, 10), stop("B", 60, 70), stop("C", 120, 130)]],
      ["two", [stop("A", 0, 10), stop("B", 80, 90)]],
    ]),
    points,
  );
  expect(result.edges.find((e) => e.a === "A" && e.b === "B")).toMatchObject({
    trains: 2,
    medianRunMinutes: 60,
  });
  expect(result.edges.some((e) => e.a === "A" && e.b === "C")).toBe(true);
  expect(result.edges.some((e) => e.a === "B" && e.b === "A")).toBe(false);
  expect(minute("00:10:00", 2)).toBe(1450);
  expect(minute("None", 1)).toBeNull();
});
