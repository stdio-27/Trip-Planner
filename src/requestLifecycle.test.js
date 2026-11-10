import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGenerate } from "./hooks/useGenerate.js";

const sampleValidPlan = {
  title: "Kyoto Adventure",
  currency: "JPY",
  days: [
    {
      label: "Day 1",
      stops: [
        {
          title: "Kinkaku-ji",
          category: "sight",
          estCost: 500,
        },
      ],
    },
  ],
  packingList: ["Walking shoes"],
};

describe("useGenerate real hook lifecycle & edge cases", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("times out at 30 seconds and shows friendly retry error", async () => {
    // Mock fetch that hangs until aborted
    global.fetch = vi.fn().mockImplementation((_url, options) => {
      return new Promise((resolve, reject) => {
        options?.signal?.addEventListener("abort", () => {
          const err = new Error("Aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });

    const { result } = renderHook(() => useGenerate());

    act(() => {
      result.current.generate({ destination: "Tokyo" });
    });

    expect(result.current.status).toBe("loading");

    // Advance timers by 30 seconds to trigger timeout
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("This is taking too long. Please try again.");
  });

  it("cancel() aborts in-flight request, clears timer, and resets status to idle with no error", async () => {
    let abortCalled = false;
    global.fetch = vi.fn().mockImplementation((_url, options) => {
      options?.signal?.addEventListener("abort", () => {
        abortCalled = true;
      });
      return new Promise(() => {}); // never resolves
    });

    const { result } = renderHook(() => useGenerate());

    act(() => {
      result.current.generate({ destination: "Kyoto" });
    });

    expect(result.current.status).toBe("loading");

    // Cancel in-flight request
    act(() => {
      result.current.cancel();
    });

    expect(abortCalled).toBe(true);
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();

    // Advancing past 30s should NOT trigger a timeout error because timer was cleared
    await act(async () => {
      vi.advanceTimersByTime(35_000);
    });
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });

  it("cancel() restores status to success if a previous plan existed", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(sampleValidPlan),
    });

    const { result } = renderHook(() => useGenerate());

    // Generate first plan successfully
    await act(async () => {
      await result.current.generate({ destination: "Kyoto" });
    });

    expect(result.current.status).toBe("success");
    expect(result.current.plan?.title).toBe("Kyoto Adventure");

    // Start a second generation that hangs
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

    act(() => {
      result.current.generate({ destination: "Osaka" });
    });

    expect(result.current.status).toBe("loading");

    // Cancel second generation
    act(() => {
      result.current.cancel();
    });

    // Should revert back to success with previous plan
    expect(result.current.status).toBe("success");
    expect(result.current.plan?.title).toBe("Kyoto Adventure");
    expect(result.current.error).toBeNull();
  });

  it("ignores stale response when a newer request is made", async () => {
    let resolveFirst;
    let resolveSecond;

    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const secondPromise = new Promise((resolve) => {
      resolveSecond = resolve;
    });

    global.fetch = vi
      .fn()
      .mockImplementationOnce(() => firstPromise)
      .mockImplementationOnce(() => secondPromise);

    const { result } = renderHook(() => useGenerate());

    // Start first request
    act(() => {
      result.current.generate({ destination: "Slow Destination" });
    });

    // Start second request immediately
    act(() => {
      result.current.generate({ destination: "Fast Destination" });
    });

    // Resolve second request first with valid plan
    await act(async () => {
      resolveSecond({
        ok: true,
        text: async () => JSON.stringify(sampleValidPlan),
      });
    });

    expect(result.current.status).toBe("success");
    expect(result.current.plan?.title).toBe("Kyoto Adventure");

    // Later, first request resolves with a different plan
    await act(async () => {
      resolveFirst({
        ok: true,
        text: async () =>
          JSON.stringify({ ...sampleValidPlan, title: "Stale Overwrite" }),
      });
    });

    // Stale response must NOT overwrite state
    expect(result.current.plan?.title).toBe("Kyoto Adventure");
  });

  it("retries once when server returns bad shape then succeeds on second attempt", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ unexpected: true }), // bad shape attempt 1
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(sampleValidPlan), // valid plan attempt 2
      });

    const { result } = renderHook(() => useGenerate());

    await act(async () => {
      await result.current.generate({ destination: "Kyoto" });
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("success");
    expect(result.current.plan?.title).toBe("Kyoto Adventure");
    expect(result.current.error).toBeNull();
  });

  it("unmount aborts in-flight request and clears timers without warning", async () => {
    let abortCalled = false;
    global.fetch = vi.fn().mockImplementation((_url, options) => {
      options?.signal?.addEventListener("abort", () => {
        abortCalled = true;
      });
      return new Promise(() => {});
    });

    const { result, unmount } = renderHook(() => useGenerate());

    act(() => {
      result.current.generate({ destination: "Tokyo" });
    });

    expect(result.current.status).toBe("loading");

    unmount();

    expect(abortCalled).toBe(true);

    // Advancing timers should not throw state updates on unmounted component
    await act(async () => {
      vi.advanceTimersByTime(35_000);
    });
  });
});
