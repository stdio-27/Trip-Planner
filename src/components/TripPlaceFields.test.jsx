import { clearSearchCache } from "../hooks/useDebouncedSearch.js";
// @vitest-environment jsdom
import { useState } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { TripPlaceFields } from "../features/places/TripPlaceFields.jsx";
import { useDebouncedSearch } from "../hooks/useDebouncedSearch.js";

afterEach(() => {
  clearSearchCache();
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const response = (data) => ({ ok: true, json: async () => data });
it("ignores a superseded lookup even when fetch resolves after abort", async () => {
  vi.useFakeTimers();
  let finishOld;
  let oldSignal;
  vi.stubGlobal(
    "fetch",
    vi.fn((url, options) => {
      if (url.endsWith("old")) {
        oldSignal = options.signal;
        return new Promise((resolve) => {
          finishOld = resolve;
        });
      }
      return Promise.resolve(response({ results: ["new"] }));
    }),
  );
  const { result, rerender } = renderHook(
    ({ url }) => useDebouncedSearch(url),
    {
      initialProps: { url: "/api/geo/search?q=old" },
    },
  );
  await act(async () => vi.advanceTimersByTime(250));
  rerender({ url: "/api/geo/search?q=new" });
  expect(oldSignal.aborted).toBe(true);
  await act(async () => vi.advanceTimersByTime(250));
  expect(result.current.data.results).toEqual(["new"]);
  await act(async () => finishOld(response({ results: ["old"] })));
  expect(result.current.data.results).toEqual(["new"]);
});

it("lets the traveler select dataset hubs when the geocoder is down", async () => {
  const airport = {
    id: "DEL",
    name: "Delhi Airport",
    stateCode: "7",
    lat: 28.56,
    lon: 77.1,
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) => {
      if (url === "/api/geo/states")
        return response({ states: [{ code: "7", name: "Delhi" }] });
      if (url.startsWith("/api/geo/districts"))
        return response({ districts: ["New Delhi"] });
      if (url.startsWith("/api/hubs/search"))
        return response({ results: [airport] });
      if (url.startsWith("/api/hubs/nearby"))
        return response({ airports: [airport], stations: [], notes: [] });
      return { ok: false, status: 503 };
    }),
  );
  function Form() {
    const [values, setValues] = useState({ origin: null, destination: null });
    return (
      <>
        <TripPlaceFields
          {...values}
          onChange={(key, value) =>
            setValues((current) => ({ ...current, [key]: value }))
          }
          errors={{}}
        />
        <output data-testid="places">{JSON.stringify(values)}</output>
      </>
    );
  }
  render(<Form />);
  await screen.findByRole("option", { name: "Delhi" }, { timeout: 8000 });
  fireEvent.change(screen.getByLabelText("Origin state"), {
    target: { value: "7" },
  });
  await screen.findByRole("option", { name: "New Delhi" });
  fireEvent.change(screen.getByLabelText("Origin district"), {
    target: { value: "New Delhi" },
  });
  await screen.findByText(/Search for an origin hub below/);
  const origin = screen.getByRole("group", { name: "Origin airport" });
  fireEvent.click(
    within(origin).getByRole("button", { name: "Not listed? Search all" }),
  );
  fireEvent.change(within(origin).getByRole("combobox"), {
    target: { value: "DEL" },
  });
  fireEvent.click(
    await within(origin).findByRole("option", { name: "Delhi Airport (DEL)" }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Use an arrival hub as destination" }),
  );
  const arrival = screen.getByRole("group", { name: "Arrival airport" });
  fireEvent.click(
    within(arrival).getByRole("button", { name: "Not listed? Search all" }),
  );
  fireEvent.change(within(arrival).getByRole("combobox"), {
    target: { value: "DEL" },
  });
  fireEvent.click(
    await within(arrival).findByRole("option", { name: "Delhi Airport (DEL)" }),
  );
  expect(JSON.parse(screen.getByTestId("places").textContent)).toMatchObject({
    origin: { district: "New Delhi", stateCode: "7", airportId: "DEL" },
    destination: {
      placeName: "Delhi Airport",
      stateCode: "7",
      airportId: "DEL",
    },
  });
});
