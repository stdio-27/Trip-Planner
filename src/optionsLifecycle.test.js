import { act, renderHook, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useApiCall } from "./hooks/useGenerate.js";
import { parseOptions } from "../shared/optionsSchema.js";
import { demoOptions } from "../server/demoOptions.js";
const trip = {
  originCity: "Delhi",
  destination: "Kyoto",
  days: 1,
  currency: "INR",
};
const response = () => ({
  ok: true,
  text: async () => JSON.stringify(demoOptions(trip)),
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("cancels options and ignores an old response after a newer one", async () => {
  let first;
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((r) => {
            first = r;
          }),
      )
      .mockResolvedValue(response()),
  );
  const { result } = renderHook(() => useApiCall("/api/options", parseOptions));
  act(() => {
    result.current.generate(trip);
  });
  act(() => result.current.cancel());
  expect(result.current.status).toBe("idle");
  await act(async () => {
    await result.current.generate(trip);
  });
  expect(result.current.status).toBe("success");
  await act(async () => first({ ok: true, text: async () => "" }));
  expect(result.current.status).toBe("success");
});
it("times options out after 30 seconds", async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (url, init) =>
        new Promise((r, j) =>
          init.signal.addEventListener("abort", () => j(new Error("aborted"))),
        ),
    ),
  );
  const { result } = renderHook(() => useApiCall("/api/options", parseOptions));
  act(() => {
    result.current.generate(trip);
  });
  await act(async () => vi.advanceTimersByTime(30000));
  expect(result.current.status).toBe("error");
  expect(result.current.error).toContain("taking too long");
});
it.each([1, 2, 3, 5, 7, 14])(
  "never silently accepts a wrong %s-day plan",
  async (days) => {
    const wrong = {
      title: "Wrong",
      currency: "INR",
      days: Array.from({ length: days === 1 ? 2 : 1 }, (_, i) => ({
        label: `Day ${i + 1}`,
        stops: [{ title: "Stop", category: "sight", estCost: 0 }],
      })),
      packingList: [],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, text: async () => JSON.stringify(wrong) });
    vi.stubGlobal("fetch", fetchMock);
    const { parsePlan } = await import("./schema.js");
    const { result } = renderHook(() => useApiCall("/api/plan", parsePlan));
    await act(async () => {
      await result.current.generate({ ...trip, days });
    });
    expect(result.current.status).toBe("error");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  },
);
