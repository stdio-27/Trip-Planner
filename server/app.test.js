// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { createApp } from "./app.js";
const servers = [];
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
async function request(app, body, endpoint = "plan") {
  const server = app.listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise((resolve) => server.once("listening", resolve));
  return fetch(`http://127.0.0.1:${server.address().port}/api/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const trip = {
  originCity: "Delhi",
  destination: "Kyoto",
  days: 1,
  currency: "JPY",
};
const plan = {
  title: "Kyoto",
  currency: "JPY",
  days: [
    {
      label: "Day 1",
      stops: [{ title: "Temple", category: "sight", estCost: 500 }],
    },
  ],
  packingList: ["Shoes"],
};
const upstream = (value) =>
  vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          candidates: [
            { content: { parts: [{ text: JSON.stringify(value) }] } },
          ],
        }),
      ),
  );
it.each([true, [], {}, " "])(
  "rejects invalid numeric types %j before calling Gemini",
  async (value) => {
    const generate = upstream(plan);
    for (const field of ["days", "budget"]) {
      const response = await request(
        createApp({ apiKey: "test", fetch: generate, mockMode: "off" }),
        { ...trip, [field]: value },
      );
      expect(response.status).toBe(400);
    }
    expect(generate).not.toHaveBeenCalled();
  },
);
it.each([
  { unexpected: true },
  { ...plan, currency: "USD" },
  { ...plan, days: [...plan.days, ...plan.days] },
  {
    ...plan,
    days: [{ label: "Day 1", stops: [{ title: "Bad", estCost: -1 }] }],
  },
])("rejects invalid model output with 502", async (value) => {
  const response = await request(
    createApp({ apiKey: "test", fetch: upstream(value), mockMode: "off" }),
    trip,
  );
  expect(response.status).toBe(502);
  expect((await response.json()).error).toContain("invalid itinerary");
});
it("returns a validated itinerary and accepts the explicit empty response", async () => {
  for (const value of [plan, { ...plan, days: [], packingList: [] }]) {
    const response = await request(
      createApp({ apiKey: "test", fetch: upstream(value), mockMode: "off" }),
      trip,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(value);
  }
});
it("bounds upstream response bytes", async () => {
  const response = await request(
    createApp({
      apiKey: "test",
      mockMode: "off",
      fetch: async () => new Response("x".repeat(1_000_001)),
    }),
    trip,
  );
  expect(response.status).toBe(502);
  expect((await response.json()).error).toContain("size limit");
});
it("enforces the actual route rate limiter", async () => {
  const app = createApp({ mockMode: "empty" });
  for (let i = 0; i < 10; i++)
    expect((await request(app, trip)).status).toBe(200);
  expect((await request(app, trip)).status).toBe(429);
});
it.each([
  [400, "rejected the request", 502],
  [401, "authentication failed", 502],
  [403, "access denied", 502],
  [404, "unavailable", 502],
  [429, "quota or rate limit", 429],
  [503, "temporarily unavailable", 502],
])(
  "explains upstream HTTP %s without exposing provider details",
  async (status, message, expected) => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await request(
        createApp({
          apiKey: "private-key",
          mockMode: "off",
          fetch: async () =>
            new Response("sensitive-provider-details", { status }),
        }),
        trip,
      );
      expect(response.status).toBe(expected);
      const body = await response.json();
      expect(body.error).toContain(message);
      expect(JSON.stringify(body)).not.toContain("private-key");
      expect(JSON.stringify(body)).not.toContain("sensitive-provider-details");
    } finally {
      spy.mockRestore();
    }
  },
);
it.each([1, 2, 3, 5, 7, 14])(
  "demo respects exactly %s requested days",
  async (days) => {
    const response = await request(createApp({ mockMode: "demo" }), {
      ...trip,
      days,
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.days).toHaveLength(days);
    expect(body.days.map((d) => d.label)).toEqual(
      Array.from({ length: days }, (_, i) => `Day ${i + 1}`),
    );
    expect(body.currency).toBe("JPY");
  },
);
it("corrects a wrong count once and includes the actual count in the prompt", async () => {
  const generate = vi
    .fn()
    .mockImplementationOnce(
      upstream({ ...plan, days: [...plan.days, ...plan.days] }),
    )
    .mockImplementationOnce(upstream(plan));
  const response = await request(
    createApp({ mockMode: "off", apiKey: "test", fetch: generate }),
    trip,
  );
  expect(response.status).toBe(200);
  expect(generate).toHaveBeenCalledTimes(2);
  expect(generate.mock.calls[1][1].body).toContain(
    "you returned 2 days; return exactly 1",
  );
});
it.each([
  "demo",
  "bad-json",
  "bad-shape",
  "empty",
  "fail",
  "options-bad-shape",
  "options-empty",
])("serves real options endpoint in %s mode", async (mode) => {
  const r = await request(createApp({ mockMode: mode }), trip, "options");
  if (["empty", "options-empty"].includes(mode))
    expect(await r.text()).toBe("");
  else if (mode === "fail") expect(r.status).toBe(500);
  else if (mode === "demo") {
    const b = await r.json();
    expect(b.currency).toBe("JPY");
    expect(b.stayOptions).toHaveLength(3);
    expect(b.origin.city).toBe("Delhi");
  } else if (mode === "bad-json")
    expect(() => JSON.parse('{"invalid":')).toThrow();
  else expect(await r.json()).toEqual({ unexpected: true });
});
it("sends validated selected modes to the provider", async () => {
  const { demoOptions } = await import("./demoOptions.js");
  const choices = demoOptions(trip);
  const selections = Object.fromEntries(
    [
      "stayOptions",
      "localTransportOptions",
      "foodOptions",
    ].map((k) => [k, choices[k][0]]),
  );
  const generate = upstream(plan);
  const r = await request(
    createApp({ mockMode: "off", apiKey: "test", fetch: generate }),
    { ...trip, selections },
  );
  expect(r.status).toBe(200);
  expect(generate.mock.calls[0][1].body).toContain("Public transport");
});

const pickedTrip = {
  days: 2, currency: "INR",
  origin: { stateCode: "7", district: "New Delhi", lat: 28.61, lon: 77.2, airportId: "DEL", stationCode: "NDLS" },
  destination: { stateCode: "18", placeName: "Guwahati", lat: 26.18, lon: 91.75, airportId: "GAU", stationCode: "GHY" },
};
it("accepts selected places and resolves hub labels from the bundled data", async () => {
  const options = await request(createApp({ mockMode: "demo" }), pickedTrip, "options");
  expect(options.status).toBe(200);
  const body = await options.json();
  expect(body.origin.nearestAirport.name).toContain("(DEL)");
  expect(body.destination.arrivalStation.name).toContain("(GHY)");
  const plan = await request(createApp({ mockMode: "demo" }), pickedTrip);
  expect(plan.status).toBe(200);
  expect((await plan.json()).days).toHaveLength(2);
});
it.each([
  { origin: { ...pickedTrip.origin, district: "Kamrup Metropolitan" } },
  { origin: { ...pickedTrip.origin, airportId: "ZZZ" } },
  { destination: { ...pickedTrip.destination, stationCode: "SCL" } },
  { destination: { ...pickedTrip.destination, lat: 90 } },
  { destination: { ...pickedTrip.destination, stateCode: "999" } },
])("rejects invalid selected geography before generation", async change => {
  const fetch = vi.fn();
  const response = await request(createApp({ mockMode: "off", fetch }), { ...pickedTrip, ...change });
  expect(response.status).toBe(400);
  expect(Object.keys((await response.json()).errors)).toContain(Object.keys(change)[0]);
  expect(fetch).not.toHaveBeenCalled();
});

const journeyInput = {
  origin: pickedTrip.origin,
  destination: pickedTrip.destination,
  currency: "INR",
  travelers: { adults: 2, children: 1 },
};
it.each(["demo", "fares-bad-json", "fares-fail", "journeys-empty"])("handles journey mock %s", async mockMode => {
  const fetch = vi.fn();
  const response = await request(createApp({ mockMode, fetch }), journeyInput, "journeys");
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(fetch).not.toHaveBeenCalled();
  if (mockMode === "journeys-empty") {
    expect(body.journeys).toEqual([]);
    expect(body.emptyReason).toBeTruthy();
  } else {
    expect(body.journeys.length).toBeGreaterThan(0);
  }
  if (mockMode === "demo") {
    for (const leg of body.journeys.flatMap(journey => journey.legs)) {
      expect(body.fares[leg.id].basic).toBeGreaterThan(0);
    }
  } else {
    expect(body.fares).toBeNull();
    if (mockMode !== "journeys-empty") expect(body.faresError).toBeTruthy();
  }
});
it("rejects unknown journey hub IDs and invalid dates", async () => {
  const app = createApp({ mockMode: "demo" });
  const unknown = await request(app, { ...journeyInput, origin: { ...journeyInput.origin, airportId: "ZZZ" } }, "journeys");
  expect(unknown.status).toBe(400);
  expect((await unknown.json()).code).toBe("INVALID_JOURNEY_PLACES");
  const invalidDate = await request(app, { ...journeyInput, date: "2026-02-30" }, "journeys");
  expect(invalidDate.status).toBe(400);
  expect((await invalidDate.json()).code).toBe("INVALID_JOURNEY_REQUEST");
});
it("retries only fare estimates using server-computed leg facts", async () => {
  const fetch = vi.fn(async (_url, init) => {
    const prompt = JSON.parse(init.body).contents[0].parts[0].text;
    const facts = JSON.parse(prompt.split("<leg_facts>\n")[1].split("\n</leg_facts>")[0]);
    expect(facts.currency).toBe("INR");
    expect(facts.legs.every(leg => leg.from && leg.to && leg.durationMin > 0)).toBe(true);
    const fares = Object.fromEntries(facts.legs.map(leg => [leg.id, { basic: 100, standard: 200, premium: 300, pricing: "perPerson" }]));
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ fares }) }] } }] });
  });
  const response = await request(createApp({ mockMode: "off", apiKey: "test-only", fetch }), journeyInput, "journeys/fares");
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.journeys).toBeUndefined();
  expect(Object.keys(body.fares).length).toBeGreaterThan(0);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it.each([1, 3, 7, 14])("uses authoritative journey times and preserves %s itinerary days", async (days) => {
  const routeApp = createApp({ mockMode: "demo" });
  const routeResponse = await request(routeApp, journeyInput, "journeys/structure");
  const route = (await routeResponse.json()).journeys[0];
  const { routeHubs } = await import("../shared/journeyTiming.js");
  const journey = { id: route.id, hubs: routeHubs(route), roundTrip: true, arrival: "night", leaveBy: "night" };
  const generate = upstream({
    ...plan, currency: "INR",
    days: Array.from({ length: days }, (_, index) => ({ ...plan.days[0], label: `Day ${index + 1}` })),
  });
  const response = await request(createApp({ mockMode: "off", apiKey: "test", fetch: generate }), {
    ...pickedTrip, days, journey, departurePreference: "morning", returnPreference: "evening",
  });
  expect(response.status).toBe(200);
  expect((await response.json()).days).toHaveLength(days);
  const prompt = JSON.parse(generate.mock.calls[0][1].body).contents[0].parts[0].text;
  expect(prompt).toContain("Day 1 starts only after arrival");
  expect(prompt).toContain("The last day ends before departure");
  expect(prompt).toContain("Leave by 18:00 (evening)");
  expect(prompt).toContain("hub-to-stay transfer");
  expect(prompt).toContain("Do not include fares already budgeted");
});
it("rejects a tampered journey, hubs or client fares before calling Gemini", async () => {
  const routeResponse = await request(createApp({ mockMode: "demo" }), journeyInput, "journeys/structure");
  const route = (await routeResponse.json()).journeys[0];
  const { routeHubs } = await import("../shared/journeyTiming.js");
  const journey = { id: route.id, hubs: routeHubs(route), roundTrip: false, arrival: "morning", leaveBy: null };
  const fetch = vi.fn();
  for (const change of [{ id: "invalid" }, { hubs: ["INVALID"] }, { fares: { rail: 0 } }]) {
    const response = await request(createApp({ mockMode: "off", fetch }), {
      ...pickedTrip, journey: { ...journey, ...change },
    });
    expect(response.status).toBe(400);
  }
  expect(fetch).not.toHaveBeenCalled();
});

it("bounds and sanitizes API request bodies and rejects unexpected query parameters", async () => {
  const app = createApp({ mockMode: "demo" });
  const server = app.listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise((resolve) => server.once("listening", resolve));
  const url = "http://127.0.0.1:" + server.address().port + "/api/";
  const post = (path, body) => fetch(url + path, {
    method: "POST", headers: { "Content-Type": "application/json" }, body,
  });
  const malformed = await post("plan", '{"private-text":');
  expect(malformed.status).toBe(400);
  expect(await malformed.json()).toEqual({ error: "Invalid request body." });
  const oversized = await post("journeys/structure", JSON.stringify({ text: "x".repeat(11000) }));
  expect(oversized.status).toBe(413);
  expect(await oversized.json()).toEqual({ error: "Request body exceeds 10 KB." });
  expect((await post("plan?extra=yes", JSON.stringify(trip))).status).toBe(400);
  expect((await fetch(url + "health?extra=yes")).status).toBe(400);
  expect((await fetch(url + "health")).headers.has("ratelimit-limit")).toBe(true);
});

it.each(["bad-json", "bad-shape", "empty", "fail"])(
  "sets up the itinerary flow without Gemini when mocking a %s plan",
  async (mockMode) => {
    const fetch = vi.fn();
    const app = createApp({ mockMode, mockStage: "plan", fetch });
    expect((await request(app, pickedTrip, "options")).status).toBe(200);
    expect((await request(app, journeyInput, "journeys/fares").then((res) => res.json())).fares).toBeTruthy();
    expect((await request(app, pickedTrip)).status).toBe(mockMode === "fail" ? 500 : 200);
    expect(fetch).not.toHaveBeenCalled();
  },
);

it("forwards only a sanitized retry delay for upstream quota errors", async()=>{
 const response=await request(createApp({mockMode:"off",apiKey:"test",fetch:async()=>new Response("private upstream data",{status:429,headers:{"Retry-After":"7"}})}),trip);
 expect(response.status).toBe(429);
 expect(response.headers.get("Retry-After")).toBe("7");
 expect(JSON.stringify(await response.json())).not.toContain("private upstream data");
});
