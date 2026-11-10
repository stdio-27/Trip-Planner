import { describe, expect, it } from "vitest";
import { moveStop, removeStop } from "./itineraryReducer.js";

function calculateBudget(plan) {
  const perDay = plan.days.map((day) => ({
    id: day.id,
    label: day.label,
    total: day.stops.reduce((sum, stop) => sum + (Number(stop.estCost) || 0), 0),
  }));
  const total = perDay.reduce((sum, day) => sum + day.total, 0);
  return { perDay, total };
}

function formatCurrency(value, currency) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${Number(value).toFixed(2)}`;
  }
}

describe("Budget calculation and formatting", () => {
  it("calculates correct per-day subtotals and overall total", () => {
    const plan = {
      title: "Japan",
      currency: "USD",
      days: [
        {
          id: "d1",
          label: "Day 1",
          stops: [
            { id: "s1", estCost: 15.5 },
            { id: "s2", estCost: 30 },
          ],
        },
        {
          id: "d2",
          label: "Day 2",
          stops: [
            { id: "s3", estCost: 45.25 },
          ],
        },
        {
          id: "d3",
          label: "Day 3",
          stops: [],
        },
      ],
    };

    const { perDay, total } = calculateBudget(plan);
    expect(perDay[0].total).toBe(45.5);
    expect(perDay[1].total).toBe(45.25);
    expect(perDay[2].total).toBe(0);
    expect(total).toBe(90.75);
  });

  it("handles non-numeric or missing estCost values gracefully as 0", () => {
    const plan = {
      days: [
        {
          id: "d1",
          label: "Day 1",
          stops: [
            { id: "s1", estCost: undefined },
            { id: "s2", estCost: null },
            { id: "s3", estCost: "invalid" },
            { id: "s4", estCost: 50 },
          ],
        },
      ],
    };

    const { perDay, total } = calculateBudget(plan);
    expect(perDay[0].total).toBe(50);
    expect(total).toBe(50);
  });

  it("updates budget subtotals correctly after moving a stop across days", () => {
    const plan = {
      days: [
        {
          id: "d1",
          label: "Day 1",
          stops: [{ id: "s1", estCost: 20 }, { id: "s2", estCost: 40 }],
        },
        {
          id: "d2",
          label: "Day 2",
          stops: [{ id: "s3", estCost: 100 }],
        },
      ],
    };

    const initial = calculateBudget(plan);
    expect(initial.total).toBe(160);

    // Move s2 (40) from Day 1 to Day 2
    const moved = moveStop(plan, "s2", "d2", 0);
    const updated = calculateBudget(moved);

    expect(updated.perDay[0].total).toBe(20);
    expect(updated.perDay[1].total).toBe(140);
    expect(updated.total).toBe(160); // Total remains invariant
  });

  it("updates budget correctly after removing a stop", () => {
    const plan = {
      days: [
        {
          id: "d1",
          label: "Day 1",
          stops: [{ id: "s1", estCost: 20 }, { id: "s2", estCost: 40 }],
        },
      ],
    };

    const next = removeStop(plan, "s1");
    const { perDay, total } = calculateBudget(next);
    expect(perDay[0].total).toBe(40);
    expect(total).toBe(40);
  });

  it("formats standard and fallback currencies without throwing", () => {
    expect(formatCurrency(1234.5, "USD")).toContain("1,234.50");
    expect(formatCurrency(100, "JPY")).toBeDefined();
    // Non-standard currency code falls back to string template
    expect(formatCurrency(50, "CUSTOM")).toBe("CUSTOM 50.00");
  });
});
