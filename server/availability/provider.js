export class NoLiveProvider {
  async check() {
    return {
      level: "unverified",
      source: null,
      dataYear: null,
      checkUrl: null,
    };
  }
}

export function snapshotAvailability(mode) {
  if (mode === "train")
    return {
      level: "scheduled",
      source: "datameet/railways",
      dataYear: 2016,
      checkUrl: "https://www.irctc.co.in/nget/train-search",
    };
  if (mode === "flight")
    return {
      level: "route-hint",
      source: "OpenFlights",
      dataYear: 2014,
      checkUrl: "https://www.google.com/travel/flights",
    };
  return { level: "unverified", source: null, dataYear: null, checkUrl: null };
}
