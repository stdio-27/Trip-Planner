// @vitest-environment jsdom
import React from "react";
import { spawn } from "node:child_process";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { clearSearchCache } from "./hooks/useDebouncedSearch.js";
import App from "./App.jsx";
let child;
afterEach(async () => {
  cleanup();
  clearSearchCache();
  vi.unstubAllGlobals();
  if (child && child.exitCode === null) {
    const closed = new Promise((resolve) => child.once("exit", resolve));
    child.kill();
    await closed;
  }
});
it("golden demo path uses HTTP from setup through journey tiers, local choices, totals and itinerary", async () => {
  const nativeFetch = globalThis.fetch;
  const script = `
 import { createApp } from "./server/app.js";
 const app=createApp({mockMode:"demo",geoProvider:{search:async q=>[{
  id:q.toLowerCase().includes("guw")?2:1,name:q.toLowerCase().includes("guw")?"Guwahati":"Delhi",
  country_code:"IN",admin1:q.toLowerCase().includes("guw")?"Assam":"Delhi",
  admin2:q.toLowerCase().includes("guw")?"Kamrup Metro":"New Delhi",
  latitude:q.toLowerCase().includes("guw")?26.18:28.61,longitude:q.toLowerCase().includes("guw")?91.75:77.2,
 }]}});
 const server=app.listen(0,"127.0.0.1",()=>console.log(JSON.stringify({port:server.address().port})));
 `;
  child = spawn(process.execPath, ["--input-type=module", "-e", script], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  const port = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.stdout.once("data", (value) => {
      try {
        resolve(JSON.parse(value.toString()).port);
      } catch (error) {
        reject(error);
      }
    });
    child.once("exit", () =>
      reject(Error("Demo server exited before readiness")),
    );
  });
  const base = "http://127.0.0.1:" + port;
  const requests = [];
  vi.stubGlobal("fetch", async (url, init) => {
    try {
      const response = await nativeFetch(new URL(url, base), init);
      const copy = await response
        .clone()
        .json()
        .catch(() => null);
      requests.push({
        url: String(url),
        status: response.status,
        keys: copy ? Object.keys(copy) : [],
      });
      return response;
    } catch (error) {
      requests.push({ url: String(url), error: error.message });
      throw error;
    }
  });
  render(<App />);
  try {
    await screen.findByRole("option", { name: "Delhi" }, { timeout: 12000 });
  } catch {
    throw Error(JSON.stringify(requests));
  }
  fireEvent.change(screen.getByLabelText("Origin state"), {
    target: { value: "7" },
  });
  await screen.findByRole("option", { name: "New Delhi" });
  fireEvent.change(screen.getByLabelText("Origin district"), {
    target: { value: "New Delhi" },
  });
  fireEvent.change(
    screen.getByRole("combobox", { name: "Destination", exact: true }),
    { target: { value: "Guw" } },
  );
  await screen.findByRole("option", { name: "Guwahati · Assam" });
  fireEvent.keyDown(
    screen.getByRole("combobox", { name: "Destination", exact: true }),
    { key: "ArrowDown" },
  );
  fireEvent.keyDown(
    screen.getByRole("combobox", { name: "Destination", exact: true }),
    { key: "Enter" },
  );
  fireEvent.click(await screen.findByRole("radio", { name: /Indira Gandhi/ }));
  fireEvent.click(screen.getByRole("radio", { name: /NEW DELHI \(NDLS\)/ }));
  await waitFor(() => {
    expect(screen.getByRole("radio", { name: /Lokpriya Gopinath/ }).checked).toBe(true);
  }, { timeout: 8000 });
  fireEvent.click(screen.getByRole("button", { name: "Explore options" }));
  await screen.findByText(/Approximate arrival/, {}, { timeout: 10000 });
  await waitFor(() =>
    expect(screen.queryByText("Estimating fares…")).toBeNull(),
  );
  fireEvent.change(screen.getByLabelText("Fare tier"), {
    target: { value: "premium" },
  });
  fireEvent.click(screen.getByLabelText("premium stay"));
  fireEvent.click(screen.getByLabelText("budget food"));
  const summary = screen.getByRole("region", { name: "Trip cost summary" });
  expect(summary.textContent).toContain("49,556.00");
  fireEvent.click(screen.getByRole("button", { name: "Build my itinerary" }));
  await screen.findByRole(
    "heading",
    { name: "A trip to Guwahati" },
    { timeout: 10000 },
  );
  expect(screen.getAllByRole("tab")).toHaveLength(3);
  expect(screen.getByText("Demo data")).toBeTruthy();
  expect(
    screen.getByRole("region", { name: "Trip cost summary" }).textContent,
  ).toContain("49,556.00");
}, 30000);
