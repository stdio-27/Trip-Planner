import fs from "node:fs";
import { parse } from "csv-parse/sync";
import json from "stream-json";
import arrays from "stream-json/streamers/stream-array.js";
export function csv(file, columns = true) {
  return parse(fs.readFileSync(file), {
    columns,
    bom: true,
    skip_empty_lines: true,
    relax_column_count: false,
    trim: true,
  });
}
export function inside(lat, lon) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= 6 &&
    lat <= 38 &&
    lon >= 68 &&
    lon <= 98
  );
}
export function km(a, b) {
  const rad = (n) => (n * Math.PI) / 180;
  const dlat = rad(b.lat - a.lat),
    dlon = rad(b.lon - a.lon);
  return (
    6371 *
    2 *
    Math.asin(
      Math.min(
        1,
        Math.sqrt(
          Math.sin(dlat / 2) ** 2 +
            Math.cos(rad(a.lat)) *
              Math.cos(rad(b.lat)) *
              Math.sin(dlon / 2) ** 2,
        ),
      ),
    )
  );
}
export async function* schedules(file) {
  const input = fs.createReadStream(file);
  const parser = json();
  const stream = arrays.asStream();
  input.on("error", (e) => stream.destroy(e));
  parser.on("error", (e) => stream.destroy(e));
  input.pipe(parser).pipe(stream);
  try {
    for await (const { value } of stream) yield value;
  } finally {
    input.destroy();
    parser.destroy();
    stream.destroy();
  }
}
export const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
export function fields(row) {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [norm(k), String(v).trim()]),
  );
}
export const aliases = {
  orissa: "odisha",
  uttaranchal: "uttarakhand",
  delhinationalcapitalterritory: "delhi",
  nationalcapitalterritoryofdelhi: "delhi",
  delhinct: "delhi",
  nctofdelhi: "delhi",
  pondicherry: "puducherry",
  andamanandnicobarislands: "andamanandnicobarislands",
  dadraandnagarhaveli: "thedadraandnagarhavelianddamananddiu",
  damananddiu: "thedadraandnagarhavelianddamananddiu",
  jammuandkashmir: "jammuandkashmir",
};
export function stateResolver(states) {
  const map = new Map(states.map((s) => [norm(s.name), s.code]));
  return (name) => map.get(aliases[norm(name)] || norm(name)) || null;
}
export function minute(time, day) {
  if (!/^\d{2}:\d{2}:\d{2}$/.test(time)) return null;
  const [h, m] = time.split(":").map(Number);
  if (h > 23 || m > 59 || !Number.isInteger(Number(day)) || day < 1)
    return null;
  return (Number(day) - 1) * 1440 + h * 60 + m;
}
export function selectMajors(stations) {
  let best = null;
  for (let threshold = 10; threshold <= 1000; threshold++) {
    const selected = stations.filter(
      (s) =>
        s.trainCount >= threshold ||
        (/\b(JN|JUNCTION|CENTRAL|TERMINUS)\b/i.test(s.name) &&
          s.trainCount >= threshold / 2),
    );
    const score = Math.abs(selected.length - 400);
    if (!best || score < best.score) best = { threshold, selected, score };
  }
  // Coverage uses service actually evidenced in this snapshot, never an invented rail map.
  const byState = new Map();
  for (const s of stations.filter((s) => s.stateCode && s.trainCount > 0)) {
    const list = byState.get(s.stateCode) || [];
    list.push(s);
    byState.set(s.stateCode, list);
  }
  const chosen = new Map(best.selected.map((s) => [s.code, s]));
  for (const list of byState.values())
    for (const s of list
      .sort(
        (a, b) => b.trainCount - a.trainCount || a.code.localeCompare(b.code),
      )
      .slice(0, 3))
      chosen.set(s.code, s);
  return {
    threshold: best.threshold,
    selected: [...chosen.values()].sort((a, b) => a.code.localeCompare(b.code)),
  };
}
export function buildGraph(trainStops, stationMap) {
  const samples = new Map();
  let invalidTimes = 0;
  for (const stops of trainStops.values()) {
    stops.sort(
      (a, b) =>
        a.arrival - b.arrival || a.departure - b.departure || a.id - b.id,
    );
    const seen = new Set();
    for (let i = 0; i < stops.length; i++)
      for (let j = i + 1; j < stops.length; j++) {
        const a = stops[i],
          b = stops[j],
          key = a.code + "|" + b.code;
        if (a.code === b.code || seen.has(key)) continue;
        const run = b.arrival - a.departure;
        if (run <= 0 || run > 10080) {
          invalidTimes++;
          continue;
        }
        seen.add(key);
        const runs = samples.get(key) || [];
        runs.push(run);
        samples.set(key, runs);
      }
  }
  const edges = [...samples]
    .map(([key, runs]) => {
      const [a, b] = key.split("|");
      runs.sort((x, y) => x - y);
      const mid = Math.floor(runs.length / 2);
      return {
        a,
        b,
        trains: runs.length,
        medianRunMinutes:
          runs.length % 2 ? runs[mid] : (runs[mid - 1] + runs[mid]) / 2,
        distanceKm: +km(stationMap.get(a), stationMap.get(b)).toFixed(2),
      };
    })
    .sort((a, b) => a.a.localeCompare(b.a) || a.b.localeCompare(b.b));
  return { edges, invalidTimes };
}
