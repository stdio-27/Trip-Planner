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
function setup(
  fetchPlan = async () => ({
    ok: true,
    text: async () => JSON.stringify(plan),
  }),
) {
  const fetchMock = vi.fn((url, init) =>
    url === "/api/options"
      ? Promise.resolve({ ok: true, text: async () => JSON.stringify(raw) })
      : fetchPlan(url, init),
  );
  vi.stubGlobal("fetch", fetchMock);
  render(<App />);
  fireEvent.change(screen.getByLabelText("Origin city"), {
    target: { value: "Delhi" },
  });
  fireEvent.change(screen.getByLabelText("Destination"), {
    target: { value: "Kyoto" },
  });
  return fetchMock;
}
async function options() {
  fireEvent.click(screen.getByRole("button", { name: "Explore options" }));
  await screen.findByRole("heading", { name: "Make it your kind of trip" });
}
async function build() {
  fireEvent.click(screen.getByRole("button", { name: "Build my itinerary" }));
  await screen.findByRole("heading", { name: "Kyoto", exact: true });
}
it.each([1, 2, 3, 5, 7, 14])(
  "sends %s days and preserves details on Back",
  async (days) => {
    const fetchMock = setup();
    fireEvent.change(screen.getByLabelText("Trip length"), {
      target: { value: String(days) },
    });
    await options();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).days).toBe(days);
    fireEvent.click(
      screen.getByRole("button", { name: "Back to trip details" }),
    );
    expect(screen.getByLabelText("Trip length").value).toBe(String(days));
    expect(screen.getByLabelText("Origin city").value).toBe("Delhi");
  },
);
it("updates totals for choices, editable estimates and presets without an AI call", async () => {
  const fetchMock = setup();
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
  setup(async () => {
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
it("blocks an invalid origin before calling the API", () => {
  const fetchMock = setup();
  fireEvent.change(screen.getByLabelText("Origin city"), {
    target: { value: " " },
  });
  fireEvent.blur(screen.getByLabelText("Origin city"));
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each(["bad-shape", "empty", "fail"])(
  "shows options %s state safely",
  async (mode) => {
    const fetchMock = setup();
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
 const fetchMock=setup();fetchMock.mockResolvedValue({ok:false,status:400,json:async()=>({errors:{originCity:"Choose a supported origin city."}})});
 fireEvent.click(screen.getByRole("button",{name:"Explore options"}));
 await waitFor(()=>expect(screen.getByLabelText("Origin city").getAttribute("aria-invalid")).toBe("true"));
 expect(screen.getByLabelText("Origin city").getAttribute("aria-describedby")).toBe("originCity-error");
});
