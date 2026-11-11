import { clearSearchCache } from "./hooks/useDebouncedSearch.js";
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import App from "./App.jsx";
import { demoOptions } from "../server/demoOptions.js";
afterEach(() => {
  clearSearchCache();
  cleanup();
  vi.unstubAllGlobals();
});
const trip = {
  destination: "Kyoto",
  originCity: "Delhi",
  days: 3,
  currency: "INR",
};
const raw = demoOptions(trip);
const leg = {
  id: "rail", mode: "train", from: { kind: "station", id: "NDLS", name: "New Delhi" },
  to: { kind: "station", id: "GHY", name: "Guwahati" },
  distanceKm: 1600, durationMin: 1200, bufferMin: 0, note: "Rail timetable",
  availability: { level: "scheduled", dataYear: 2016, checkUrl: "https://www.irctc.co.in/nget/train-search" },
};
const routes = { journeys: [
  { id: "rail-option", label: "Train", legs: [leg], totalDurationMin: 1200, changes: 0, modes: ["train"] },
  { id: "cab-option", label: "Cab", legs: [{ ...leg, id: "cab", mode: "cab" }], totalDurationMin: 1200, changes: 0, modes: ["cab"] },
], emptyReason: null };
const fares = { fares: {
  rail: { basic: 30, standard: 50, premium: 100, pricing: "perPerson" },
  cab: { basic: 50, standard: 100, premium: 200, pricing: "perVehicle" },
}, faresError: null };
const plan = {
  title: "Kyoto",
  currency: "INR",
  days: [
    {
      label: "Day 1",
      stops: [{ title: "Temple", category: "sight", estCost: 20 }],
    },
    { label: "Day 2", stops: [] },
    { label: "Day 3", stops: [] },
  ],
  packingList: ["Shoes"],
};
async function setup(
  fetchPlan = async () => ({
    ok: true,
    text: async () => JSON.stringify(plan),
  }),
  journeyOverrides = {},
) {
  const fetchMock = vi.fn((url, init) =>
    url === "/api/options"
      ? Promise.resolve({ ok: true, text: async () => JSON.stringify(raw) })
      : fetchPlan(url, init),
  );
  const delhi = {
    id: 1,
    name: "Delhi",
    district: "New Delhi",
    state: "Delhi",
    stateCode: "7",
    lat: 28.61,
    lon: 77.2,
  };
  const guwahati = {
    id: 2,
    name: "Guwahati",
    district: "Kamrup Metropolitan",
    state: "Assam",
    stateCode: "18",
    lat: 26.18,
    lon: 91.75,
  };
  vi.stubGlobal("fetch", async (url, init) => {
    if (url === "/api/health") return Response.json({ ok: true, mode: "demo" });
    if (url === "/api/journeys/structure") return Response.json(journeyOverrides.routes ?? routes);
    if (url === "/api/journeys/fares") return Response.json(journeyOverrides.fares?.() ?? fares);
    if (init?.method === "POST") return fetchMock(url, init);
    const data =
      url === "/api/geo/states"
        ? {
            states: [
              { code: "7", name: "Delhi" },
              { code: "18", name: "Assam" },
            ],
          }
        : url.startsWith("/api/geo/districts")
          ? { districts: ["New Delhi"] }
          : url.startsWith("/api/hubs/nearby")
            ? { airports: [], stations: [], notes: [] }
            : { results: [url.includes("state=7") ? delhi : guwahati] };
    return { ok: true, json: async () => data };
  });
  render(<App />);
  await screen.findByRole("option", { name: "Delhi" }, { timeout: 8000 });
  fireEvent.change(screen.getByLabelText("Origin state"), {
    target: { value: "7" },
  });
  await screen.findByRole("option", { name: "New Delhi" });
  fireEvent.change(screen.getByLabelText("Origin district"), {
    target: { value: "New Delhi" },
  });
  const destination = screen.getByLabelText("Destination");
  fireEvent.change(destination, { target: { value: "Guw" } });
  await screen.findByRole("option", { name: "Guwahati · Assam" });
  fireEvent.keyDown(destination, { key: "ArrowDown" });
  fireEvent.keyDown(destination, { key: "Enter" });
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Explore options" }).disabled,
    ).toBe(false),
  );
  return fetchMock;
}
async function options() {
  fireEvent.click(screen.getByRole("button", { name: "Explore options" }));
  await screen.findByRole("heading", { name: "Make it your kind of trip" });
}
async function build() {
  await screen.findByRole("radio", { name: /Train New Delhi/ });
  fireEvent.click(screen.getByRole("button", { name: "Build my itinerary" }));
  await screen.findByRole("heading", { name: "Kyoto", exact: true });
}
it.each([1, 2, 3, 5, 7, 14])(
  "sends %s days and preserves details on Back",
  async (days) => {
    const fetchMock = await setup();
    fireEvent.change(screen.getByLabelText("Trip length"), {
      target: { value: String(days) },
    });
    await options();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).days).toBe(days);
    fireEvent.click(
      screen.getByRole("button", { name: "Back to trip details" }),
    );
    expect(screen.getByLabelText("Trip length").value).toBe(String(days));
    await screen.findByRole("option", { name: "New Delhi" });
    expect(screen.getByLabelText("Origin district").value).toBe("New Delhi");
    expect(screen.getByLabelText("Destination").value).toBe("Guwahati");
    expect(
      JSON.parse(fetchMock.mock.calls[0][1].body).destination,
    ).toMatchObject({ placeName: "Guwahati", stateCode: "18" });
  },
  15000,
);
it("updates totals for choices, editable estimates and presets without an AI call", async () => {
  const fetchMock = await setup();
  await options();
  const summary = screen.getByRole("region", { name: "Trip cost summary" });
  const before = summary.textContent;
  fireEvent.click(screen.getByLabelText("premium stay"));
  expect(summary.textContent).not.toBe(before);
  const premium = summary.textContent;
  fireEvent.change(
    screen.getByLabelText("Edit premium stay pricePerRoomPerNight"),
    { target: { value: "10000" } },
  );
  expect(summary.textContent).not.toBe(premium);
  fireEvent.click(screen.getByRole("button", { name: "Cheapest combo" }));
  expect(screen.getByLabelText("budget stay").checked).toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("retains packing through cancellation and supports remove and undo", async () => {
  let calls = 0;
  await setup(async () => {
    calls++;
    return calls === 1
      ? { ok: true, text: async () => JSON.stringify(plan) }
      : new Promise(() => {});
  });
  await options();
  await build();
  fireEvent.click(screen.getByLabelText("Shoes"));
  fireEvent.change(screen.getByLabelText("Add a packing item"), {
    target: { value: "Camera" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add item" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove Temple" }));
  expect(screen.queryByRole("heading", { name: "Temple" })).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Undo the last itinerary change" }),
  );
  expect(screen.getByRole("heading", { name: "Temple" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Build my itinerary" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByLabelText("Shoes").checked).toBe(true);
  expect(screen.getByLabelText("Camera")).toBeTruthy();
});
it("clears the district and selected origin when the state changes", async () => {
  const fetchMock = await setup();
  fireEvent.change(screen.getByLabelText("Origin state"), {
    target: { value: "18" },
  });
  expect(screen.getByLabelText("Origin district").value).toBe("");
  expect(screen.queryByText("Origin airport")).toBeNull();
  expect(screen.getByRole("button", { name: "Explore options" }).disabled).toBe(
    true,
  );
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each(["bad-shape", "empty", "fail"])(
  "shows options %s state safely",
  async (mode) => {
    const fetchMock = await setup();
    fetchMock.mockImplementation(async () =>
      mode === "fail"
        ? {
            ok: false,
            status: 500,
            json: async () => ({ error: "Mock server failure." }),
          }
        : {
            ok: true,
            text: async () =>
              mode === "empty" ? "" : JSON.stringify({ unexpected: true }),
          },
    );
    fireEvent.click(screen.getByRole("button", { name: "Explore options" }));
    if (mode === "empty")
      await screen.findByRole("heading", { name: "No itinerary to show yet" });
    else await screen.findByRole("button", { name: "Try again" });
    expect(
      screen.queryByRole("heading", { name: "Make it your kind of trip" }),
    ).toBeNull();
  },
);
it("shows server field errors inline on the setup form", async () => {
  const fetchMock = await setup();
  fetchMock.mockResolvedValue({
    ok: false,
    status: 400,
    json: async () => ({
      errors: { origin: "Choose a supported origin city." },
    }),
  });
  fireEvent.click(screen.getByRole("button", { name: "Explore options" }));
  await waitFor(() =>
    expect(
      screen.getByLabelText("Origin state").getAttribute("aria-invalid"),
    ).toBe("true"),
  );
  expect(
    screen.getByLabelText("Origin state").getAttribute("aria-describedby"),
  ).toBe("origin-error");
});

it("requires selecting a replacement after editing a destination", async () => {
  const fetchMock = await setup();
  const destination = screen.getByRole("combobox", { name: "Destination" });
  fireEvent.change(destination, { target: { value: "Unselected city" } });
  fireEvent.keyDown(destination, { key: "Escape" });
  expect(screen.getByRole("button", { name: "Explore options" }).disabled).toBe(
    true,
  );
  expect(screen.getByText("Choose a place from the list.")).toBeTruthy();
  expect(fetchMock).not.toHaveBeenCalled();
});

it("selects a journey, updates fare totals and resets after a traveler change", async () => {
  await setup();
  await options();
  await screen.findByText(/^₹100\.00 per traveler/);
  const cab = screen.getByRole("radio", { name: /Cab New Delhi/ });
  cab.focus();
  fireEvent.click(cab);
  expect(cab.checked).toBe(true);
  fireEvent.click(screen.getByLabelText("Return the same way"));
  fireEvent.change(screen.getByLabelText("Fare tier"), { target: { value: "premium" } });
  expect(screen.getByRole("list", { name: "Travel costs by leg" }).textContent).toMatch(/200\.00/);
  fireEvent.click(screen.getByRole("button", { name: "Back to trip details" }));
  fireEvent.change(screen.getByLabelText(/^Adults/), { target: { value: "2" } });
  await options();
  await screen.findByText(/previous journey selection was reset/);
  expect((await screen.findByRole("radio", { name: /Train New Delhi/ })).checked).toBe(true);
});
it("retries fares only and keeps the selected journey", async () => {
  const failedOnce = vi.fn()
    .mockReturnValueOnce({ fares: null, faresError: "Unavailable" })
    .mockReturnValue(fares);
  const optionsFetch = await setup(undefined, { fares: failedOnce });
  await options();
  const retry = await screen.findByRole("button", { name: "Estimate prices again" });
  fireEvent.click(screen.getByRole("radio", { name: /Cab New Delhi/ }));
  fireEvent.click(retry);
  await screen.findByText(/200\.00 per traveler/);
  expect(screen.getByRole("radio", { name: /Cab New Delhi/ }).checked).toBe(true);
  expect(optionsFetch).toHaveBeenCalledTimes(1);
  expect(failedOnce).toHaveBeenCalledTimes(2);
});

it("keeps trip details available when no journeys are found", async () => {
  await setup(undefined, { routes: { journeys: [], emptyReason: "No connection matched the selected hubs." } });
  await options();
  expect((await screen.findByText(/No connection matched/)).textContent).toContain("Change hubs");
  expect(screen.getByRole("button", { name: "Build my itinerary" }).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Change hubs" }));
  expect((await screen.findByRole("combobox", { name: "Destination" })).value).toBe("Guwahati");
  expect(screen.getByLabelText("Origin district").value).toBe("New Delhi");
});

it("shows Demo data when the backend reports demo mode", async()=>{
 await setup();
 expect(await screen.findByText("Demo data")).toBeTruthy();
});

it("has no automated axe violations across setup, choices and itinerary",async()=>{
 const {default:axe}=await import("axe-core");
 await setup();
 const check=async()=>{
  const result=await axe.run(document.body,{rules:{"color-contrast":{enabled:false}}});
  expect(result.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)}))).toEqual([]);
 };
 await check();
 await options();
 await screen.findByRole("radio",{name:/Train New Delhi/});
 await check();
 await build();
 await check();
},60000);

it("keeps focus on the itinerary heading after the loading view disappears",async()=>{
 await setup();
 await options();
 await build();
 await waitFor(()=>expect(document.activeElement).toBe(screen.getByRole("heading",{name:"Kyoto",exact:true})));
});
