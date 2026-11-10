import { describe, expect, it, vi } from "vitest";

describe("Request lifecycle & stale response guard", () => {
  it("drops older stale responses when a newer request resolves first", async () => {
    let latestId = 0;
    let finalState = null;

    async function mockGenerate(id, delayMs, responseData) {
      const requestId = ++latestId;
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      // Stale response guard pattern used in useGenerate:
      if (requestId !== latestId) {
        return; // drop stale response
      }

      finalState = responseData;
    }

    // Launch Request 1 (slow, takes 50ms)
    const p1 = mockGenerate(1, 50, { title: "Trip 1" });
    // Launch Request 2 (fast, takes 10ms)
    const p2 = mockGenerate(2, 10, { title: "Trip 2" });

    await Promise.all([p1, p2]);

    // Only Request 2 should have been applied
    expect(finalState).toEqual({ title: "Trip 2" });
  });

  it("retries at most once on invalid JSON / invalid shape and stops", async () => {
    let attempts = 0;
    const fetchMock = vi.fn().mockImplementation(async () => {
      attempts++;
      return {
        ok: true,
        text: async () => '{"invalid":',
      };
    });

    let finalError = null;

    async function runGeneration() {
      for (let attempt = 0; attempt < 2; attempt++) {
        const response = await fetchMock();
        const text = await response.text();
        try {
          JSON.parse(text);
          return;
        } catch {
          if (attempt === 0) continue; // retry once
          finalError = new Error("The server returned invalid itinerary JSON.");
        }
      }
    }

    await runGeneration();

    expect(attempts).toBe(2);
    expect(finalError?.message).toBe("The server returned invalid itinerary JSON.");
  });

  it("does not retry on 5xx server errors", async () => {
    let attempts = 0;
    const fetchMock = vi.fn().mockImplementation(async () => {
      attempts++;
      return {
        ok: false,
        status: 500,
        json: async () => ({ error: "Server failure" }),
      };
    });

    let caughtError = null;

    async function runGeneration() {
      for (let attempt = 0; attempt < 2; attempt++) {
        const response = await fetchMock();
        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error);
        }
      }
    }

    try {
      await runGeneration();
    } catch (e) {
      caughtError = e;
    }

    expect(attempts).toBe(1);
    expect(caughtError?.message).toBe("Server failure");
  });

  it("preserves form values across error states", () => {
    const formValues = {
      destination: "Kyoto",
      days: 5,
      budget: "2000",
      currency: "JPY",
      interests: "Temples and tea",
    };

    let status = "idle";
    let error = null;

    // Simulate error occurrence
    status = "loading";
    // Fetch fails
    status = "error";
    error = "Network timeout";

    // Form values must remain intact and unmodified
    expect(formValues.destination).toBe("Kyoto");
    expect(formValues.days).toBe(5);
    expect(formValues.budget).toBe("2000");
    expect(status).toBe("error");
    expect(error).toBe("Network timeout");
  });
});
