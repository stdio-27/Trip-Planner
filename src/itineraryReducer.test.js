import { describe, expect, it } from "vitest";
import {
  initialItineraryState,
  itineraryReducer,
  moveStop,
} from "./itineraryReducer.js";

function makePlan() {
  return {
    title: "City break",
    days: [
      {
        id: "day-1",
        label: "Day 1",
        stops: [{ id: "stop-a" }, { id: "stop-b" }, { id: "stop-c" }],
      },
      {
        id: "day-2",
        label: "Day 2",
        stops: [{ id: "stop-d" }],
      },
    ],
  };
}

describe("itineraryReducer MOVE_STOP", () => {
  it("moves a stop to another position in the same day without mutating the plan", () => {
    const original = makePlan();
    const next = moveStop(original, "stop-a", "day-1", 2);

    expect(next).not.toBe(original);
    expect(next.days).not.toBe(original.days);
    expect(next.days[0].stops.map((stop) => stop.id)).toEqual([
      "stop-b",
      "stop-c",
      "stop-a",
    ]);
    expect(original.days[0].stops.map((stop) => stop.id)).toEqual([
      "stop-a",
      "stop-b",
      "stop-c",
    ]);
  });

  it("moves a stop across days and preserves unaffected day references", () => {
    const original = makePlan();
    const next = itineraryReducer(
      { ...initialItineraryState, present: original },
      {
        type: "MOVE_STOP",
        stopId: "stop-b",
        toDayId: "day-2",
        toIndex: 0,
      },
    );

    expect(next.present.days.map((day) => day.stops.map((stop) => stop.id))).toEqual([
      ["stop-a", "stop-c"],
      ["stop-b", "stop-d"],
    ]);
    expect(next.past).toEqual([original]);
    expect(original.days.map((day) => day.stops.map((stop) => stop.id))).toEqual([
      ["stop-a", "stop-b", "stop-c"],
      ["stop-d"],
    ]);
  });
});
