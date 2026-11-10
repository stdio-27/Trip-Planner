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

  it("handles null for optional string fields without dropping the stop", () => {
    const result = parsePlan(
      validPlan({
        days: [
          {
            label: "Day 1",
            stops: [
              {
                title: "Walk in the park",
                category: "activity",
                estCost: 0,
                description: null,
                location: null,
                time: null,
              },
            ],
          },
        ],
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.droppedItems).toBe(0);
      expect(result.data.days[0].stops).toHaveLength(1);
      expect(result.data.days[0].stops[0].title).toBe("Walk in the park");
    }
  });

  it("normalizes negative, NaN, and Infinity estCost to 0, while keeping huge numbers", () => {
    const result = parsePlan(
      validPlan({
        days: [
          {
            label: "Day 1",
            stops: [
              { title: "Negative", estCost: -50 },
              { title: "NaN", estCost: Number.NaN },
              { title: "Infinity", estCost: Number.POSITIVE_INFINITY },
              { title: "Huge", estCost: 1000000 },
            ],
          },
        ],
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.days[0].stops.map((s) => s.estCost)).toEqual([
        0, 0, 0, 1000000,
      ]);
    }
  });

  it("safely strips unknown extra fields without rejecting the stop", () => {
    const result = parsePlan(
      validPlan({
        extraTopLevel: "garbage",
        days: [
          {
            label: "Day 1",
            stops: [
              {
                title: "Sight",
                category: "sight",
                estCost: 10,
                unknownField: "extra-metadata",
              },
            ],
          },
        ],
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.days[0].stops[0].unknownField).toBeUndefined();
    }
  });

  it("preserves HTML and script tags as raw escaped strings", () => {
    const malicious = '<script>alert("xss")</script>';
    const result = parsePlan(
      validPlan({
        title: malicious,
        days: [
          {
            label: "Day 1",
            stops: [{ title: malicious, description: malicious }],
          },
        ],
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe(malicious);
      expect(result.data.days[0].stops[0].title).toBe(malicious);
    }
  });

  it("allows duplicate stop names while assigning unique IDs", () => {
    const result = parsePlan(
      validPlan({
        days: [
          {
            label: "Day 1",
            stops: [
              { title: "Coffee", category: "food", estCost: 5 },
              { title: "Coffee", category: "food", estCost: 5 },
            ],
          },
        ],
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      const stops = result.data.days[0].stops;
      expect(stops).toHaveLength(2);
      expect(stops[0].id).not.toBe(stops[1].id);
    }
  });

  it("handles null or omitted packingList gracefully", () => {
    const withoutPacking = validPlan();
    delete withoutPacking.packingList;
    const resultOmitted = parsePlan(withoutPacking);
    expect(resultOmitted.success).toBe(true);
    if (resultOmitted.success) {
      expect(resultOmitted.data.packingList).toEqual([]);
    }

    const withNull = validPlan({ packingList: null });
    const resultNull = parsePlan(withNull);
    expect(resultNull.success).toBe(true);
    if (resultNull.success) {
      expect(resultNull.data.packingList).toEqual([]);
    }
  });

  it("assigns unique UUIDs to each packing list item", () => {
    const result = parsePlan(
      validPlan({
        packingList: ["Sunscreen", "Passport", "Power bank"],
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.packingList).toHaveLength(3);
      expect(result.data.packingList[0]).toMatchObject({ text: "Sunscreen" });
      expect(result.data.packingList[1]).toMatchObject({ text: "Passport" });
      expect(result.data.packingList[2]).toMatchObject({ text: "Power bank" });

      const ids = result.data.packingList.map((item) => item.id);
      expect(typeof ids[0]).toBe("string");
      expect(ids[0].length).toBeGreaterThan(0);
      expect(new Set(ids).size).toBe(3);
    }
  });

  it("handles 15+ days and 50+ stops performantly", () => {
    const days = [];
    for (let d = 1; d <= 15; d++) {
      const stops = [];
      for (let s = 1; s <= 4; s++) {
        stops.push({
          title: `Day ${d} Stop ${s}`,
          category: "sight",
          estCost: 15,
        });
      }
      days.push({ label: `Day ${d}`, stops });
    }

    const largePlan = validPlan({ days });
    const result = parsePlan(largePlan);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.days).toHaveLength(15);
      const allStopIds = result.data.days.flatMap((day) => day.stops.map((s) => s.id));
      expect(allStopIds).toHaveLength(60);
      expect(new Set(allStopIds).size).toBe(60);
    }
  });
});
