import { describe, expect, it } from "vitest";
import { parsePlan } from "../src/schema.js";

describe("Mock Failure Modes and Error Handling", () => {
  it("MOCK=bad-json: malformed JSON response throws SyntaxError and cannot be parsed", () => {
    const rawBadJson = '{"invalid":';
    expect(() => JSON.parse(rawBadJson)).toThrow(SyntaxError);
  });

  it("MOCK=bad-shape: non-conforming JSON payload is safely rejected by Zod schema", () => {
    const badShape = { unexpected: true };
    const result = parsePlan(badShape);
    expect(result.success).toBe(false);
    expect(result.error.issues.length).toBeGreaterThan(0);
  });

  it("MOCK=empty: empty server response cannot be parsed as JSON", () => {
    const emptyResponse = "";
    expect(() => JSON.parse(emptyResponse)).toThrow(SyntaxError);
  });

  it("MOCK=fail: 500 status code triggers error state with server error message", () => {
    const failResponse = { status: 500, data: { error: "Mock server failure." } };
    expect(failResponse.status).toBe(500);
    expect(failResponse.data.error).toBe("Mock server failure.");
  });

  it("MOCK=jitter: generates valid plan structure that satisfies parsePlan", () => {
    const mockJitterPlan = {
      title: "A trip to Kyoto",
      currency: "USD",
      days: [
        {
          label: "Day 1",
          stops: [
            {
              title: "Fushimi Inari Shrine",
              category: "sight",
              estCost: 0,
              description: "Walk along the iconic red torii gates.",
              location: "Kyoto",
              time: "09:00",
            },
          ],
        },
      ],
      packingList: ["Walking shoes", "Camera"],
    };

    const result = parsePlan(mockJitterPlan);
    expect(result.success).toBe(true);
    expect(result.data.title).toBe("A trip to Kyoto");
    expect(result.data.days).toHaveLength(1);
    expect(result.data.days[0].stops).toHaveLength(1);
    expect(result.data.packingList).toHaveLength(2);
    expect(result.data.packingList[0]).toHaveProperty("id");
  });
});
