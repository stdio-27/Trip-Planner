import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App.jsx";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const plan = { title: "Kyoto", currency: "USD", days: [{ label: "Day 1", stops: [{ title: "Temple", category: "sight", estCost: 20 }] }], packingList: ["Shoes"] };
const ok = () => ({ ok: true, text: async () => JSON.stringify(plan) });

it("submits the chip duration and honors a subsequent explicit day preference", async () => {
  const fetchMock = vi.fn().mockImplementation(async () => ok());
  vi.stubGlobal("fetch", fetchMock);
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "5-day cultural trip to Paris" }));
  expect(screen.getByLabelText("Trip length").value).toBe("5");
  fireEvent.click(screen.getByRole("button", { name: "Generate itinerary" }));
  await screen.findByRole("heading", { name: "Kyoto" });
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).days).toBe(5);
  fireEvent.change(screen.getByLabelText("Trip length"), { target: { value: "7" } });
  fireEvent.click(screen.getByRole("button", { name: "Generate itinerary" }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  expect(JSON.parse(fetchMock.mock.calls[1][1].body).days).toBe(7);
});

it.each(["cancel", "error", "empty"])("retains packing edits through %s and resets on a new plan", async (outcome) => {
  let resolveNext;
  const fetchMock = vi.fn().mockResolvedValueOnce(ok()).mockImplementationOnce(() => new Promise(resolve => { resolveNext = resolve; })).mockResolvedValue(ok());
  vi.stubGlobal("fetch", fetchMock);
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "3 days exploring temples in Kyoto" }));
  fireEvent.click(screen.getByRole("button", { name: "Generate itinerary" }));
  await screen.findByLabelText("Shoes");
  fireEvent.click(screen.getByLabelText("Shoes"));
  fireEvent.change(screen.getByLabelText("Add a packing item"), { target: { value: "Camera" } });
  fireEvent.click(screen.getByRole("button", { name: "Add item" }));
  fireEvent.click(screen.getByRole("button", { name: "Generate itinerary" }));
  if (outcome === "cancel") {
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  } else {
    resolveNext(outcome === "error" ? { ok: false, status: 500, json: async () => ({ error: "Failure" }) } : { ok: true, text: async () => "" });

    await waitFor(() => expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull());
  }
  // The old itinerary remains available even while a replacement fails or is empty.
  expect(screen.getByLabelText("Shoes").checked).toBe(true);
  expect(screen.getByLabelText("Camera")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Generate itinerary" }));
  await screen.findByLabelText("Shoes");
  expect(screen.getByLabelText("Shoes").checked).toBe(false);
  expect(screen.queryByLabelText("Camera")).toBeNull();
});

it("renders budget changes after removal and undo using the real summary", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok()));
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "3 days exploring temples in Kyoto" }));
  fireEvent.click(screen.getByRole("button", { name: "Generate itinerary" }));
  await screen.findByRole("heading", { name: "Kyoto" });
  expect(screen.getAllByText("$20.00").length).toBe(2);
  fireEvent.click(screen.getByRole("button", { name: "Remove Temple" }));
  expect(screen.getAllByText("$0.00").length).toBe(2);
  fireEvent.click(screen.getByRole("button", { name: "Undo the last itinerary change" }));
  expect(screen.getAllByText("$20.00").length).toBe(2);
});


it("blocks invalid day and budget preferences before a request", () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "3 days exploring temples in Kyoto" }));
  fireEvent.change(screen.getByLabelText("Trip length"), { target: { value: "31" } });
  fireEvent.click(screen.getByRole("button", { name: "Generate itinerary" }));
  expect(screen.getByRole("alert").textContent).toContain("between 1 and 14");
  fireEvent.change(screen.getByLabelText("Trip length"), { target: { value: "3" } });
  fireEvent.change(screen.getByLabelText("Approximate budget (optional)"), { target: { value: "-1" } });
  fireEvent.click(screen.getByRole("button", { name: "Generate itinerary" }));
  expect(screen.getByRole("alert").textContent).toContain("non-negative");
  expect(fetchMock).not.toHaveBeenCalled();
});
