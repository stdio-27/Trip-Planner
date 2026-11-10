// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { createApp } from "./app.js";
const servers = [];
afterEach(async () => { await Promise.all(servers.splice(0).map(server => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }))); });
async function request(app, body) {
  const server = app.listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise(resolve => server.once("listening", resolve));
  return fetch(`http://127.0.0.1:${server.address().port}/api/plan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
const trip = { destination: "Kyoto", days: 1, currency: "JPY" };
const plan = { title: "Kyoto", currency: "JPY", days: [{ label: "Day 1", stops: [{ title: "Temple", category: "sight", estCost: 500 }] }], packingList: ["Shoes"] };
const upstream = value => vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] })));
it.each([true, [], {}, " "])("rejects invalid numeric types %j before calling Gemini", async value => {
  const generate = upstream(plan);
  for (const field of ["days", "budget"]) {
    const response = await request(createApp({ apiKey: "test", fetch: generate, mockMode: "off" }), { ...trip, [field]: value });
    expect(response.status).toBe(400);
  }
  expect(generate).not.toHaveBeenCalled();
});
it.each([{ unexpected: true }, { ...plan, currency: "USD" }, { ...plan, days: [...plan.days, ...plan.days] }, { ...plan, days: [{ label: "Day 1", stops: [{ title: "Bad", estCost: -1 }] }] }])("rejects invalid model output with 502", async value => {
  const response = await request(createApp({ apiKey: "test", fetch: upstream(value), mockMode: "off" }), trip);
  expect(response.status).toBe(502);
  expect((await response.json()).error).toContain("invalid itinerary");
});
it("returns a validated itinerary and accepts the explicit empty response", async () => {
  for (const value of [plan, { ...plan, days: [], packingList: [] }]) {
    const response = await request(createApp({ apiKey: "test", fetch: upstream(value), mockMode: "off" }), trip);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(value);
  }
});
it("bounds upstream response bytes", async () => {
  const response = await request(createApp({ apiKey: "test", mockMode: "off", fetch: async () => new Response("x".repeat(1_000_001)) }), trip);
  expect(response.status).toBe(502);
  expect((await response.json()).error).toContain("size limit");
});
it("enforces the actual route rate limiter", async () => {
  const app = createApp({ mockMode: "empty" });
  for (let i = 0; i < 10; i++) expect((await request(app, trip)).status).toBe(200);
  expect((await request(app, trip)).status).toBe(429);
});
it.each([
  [400, "rejected the request", 502],
  [401, "authentication failed", 502],
  [403, "access denied", 502],
  [404, "unavailable", 502],
  [429, "quota or rate limit", 429],
  [503, "temporarily unavailable", 502],
])("explains upstream HTTP %s without exposing provider details", async (status, message, expected) => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const response = await request(createApp({ apiKey: "private-key", mockMode: "off", fetch: async () => new Response("sensitive-provider-details", { status }) }), trip);
    expect(response.status).toBe(expected);
    const body = await response.json();
    expect(body.error).toContain(message);
    expect(JSON.stringify(body)).not.toContain("private-key");
    expect(JSON.stringify(body)).not.toContain("sensitive-provider-details");
  } finally { spy.mockRestore(); }
});
it.each([1,2,3,5,7,14])("demo respects exactly %s requested days", async days => {
  const response = await request(createApp({mockMode:"demo"}), {...trip,days});
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.days).toHaveLength(days);
  expect(body.days.map(d=>d.label)).toEqual(Array.from({length:days},(_,i)=>`Day ${i+1}`));
  expect(body.currency).toBe("JPY");
});
it("corrects a wrong count once and includes the actual count in the prompt", async () => {
  const generate = vi.fn().mockImplementationOnce(upstream({...plan,days:[...plan.days,...plan.days]})).mockImplementationOnce(upstream(plan));
  const response = await request(createApp({mockMode:"off",apiKey:"test",fetch:generate}),trip);
  expect(response.status).toBe(200);
  expect(generate).toHaveBeenCalledTimes(2);
  expect(generate.mock.calls[1][1].body).toContain("you returned 2 days; return exactly 1");
});
