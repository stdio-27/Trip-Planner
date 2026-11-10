import { describe, expect, it } from "vitest";
import { parsePlan } from "./schema.js";

function validPlan(overrides = {}) {
  return {
    title: "City break",
    currency: "USD",
    days: [
      {
        label: "Day 1",
        stops: [
          {
            title: "Visit the old town",
            category: "sight",
            estCost: 10,
          },
        ],
      },
    ],
    packingList: ["Walking shoes"],
    ...overrides,
  };
}

describe("parsePlan", () => {
  it("rejects a response with the wrong top-level shape", () => {
    const result = parsePlan({ destination: "Paris", activities: [] });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });

  it("reports empty days without rejecting the rest of the plan", () => {
    const result = parsePlan(
      validPlan({
        days: [{ label: "Arrival", stops: [] }],
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.days).toHaveLength(1);
      expect(result.data.emptyDays).toEqual([
        { id: result.data.days[0].id, label: "Arrival" },
      ]);
    }
  });

  it("drops an invalid stop and keeps valid stops from the same day", () => {
    const result = parsePlan(
      validPlan({
        days: [
          {
            label: "Day 1",
            stops: [
              { title: "Breakfast", category: "food", estCost: 12 },
              { title: "", category: "sight", estCost: 5 },
              { title: "Museum", category: "sight", estCost: 18 },
            ],
          },
        ],
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.droppedItems).toBe(1);
      expect(result.data.days[0].stops.map((stop) => stop.title)).toEqual([
        "Breakfast",
        "Museum",
      ]);
      expect(result.data.emptyDays).toEqual([]);
    }
  });

  it("normalizes unknown categories and invalid costs", () => {
    const result = parsePlan(
      validPlan({
        days: [
          {
            label: "Day 1",
            stops: [
              { title: "Unexpected activity", category: "concert", estCost: "not-a-number" },
              { title: "Free walk", category: "SIGHT", estCost: "0" },
            ],
          },
        ],
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.days[0].stops).toMatchObject([
        { category: "other", estCost: 0 },
        { category: "sight", estCost: 0 },
      ]);
    }
  });
});
