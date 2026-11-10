import { describe, expect, it } from "vitest";
import {
  initialItineraryState,
  itineraryReducer,
  moveStop,
  removeStop,
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

function deepFreeze(obj) {
  if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    Object.keys(obj).forEach((key) => deepFreeze(obj[key]));
  }
  return obj;
}

describe("itineraryReducer MOVE_STOP", () => {
  it("moves a stop to another position in the same day without mutating the plan", () => {
    const original = deepFreeze(makePlan());
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

  it("moves a stop up within the same day", () => {
    const original = deepFreeze(makePlan());
    const next = moveStop(original, "stop-c", "day-1", 0);

    expect(next.days[0].stops.map((s) => s.id)).toEqual([
      "stop-c",
      "stop-a",
      "stop-b",
    ]);
  });

  it("returns the exact same plan reference when moving a stop onto its current position", () => {
    const original = deepFreeze(makePlan());
    const next = moveStop(original, "stop-b", "day-1", 1);
    expect(next).toBe(original);
  });

  it("returns the exact same plan reference when stopId or dayId does not exist", () => {
    const original = deepFreeze(makePlan());
    expect(moveStop(original, "unknown-stop", "day-1", 0)).toBe(original);
    expect(moveStop(original, "stop-a", "unknown-day", 0)).toBe(original);
  });

  it("moves a stop into an empty day and clamps out-of-bounds indices", () => {
    const plan = deepFreeze({
      title: "Trip",
      days: [
        { id: "day-1", label: "Day 1", stops: [{ id: "stop-1" }] },
        { id: "day-2", label: "Day 2", stops: [] },
      ],
    });

    const nextNegative = moveStop(plan, "stop-1", "day-2", -5);
    expect(nextNegative.days[0].stops).toHaveLength(0);
    expect(nextNegative.days[1].stops.map((s) => s.id)).toEqual(["stop-1"]);

    const nextHuge = moveStop(plan, "stop-1", "day-2", 999);
    expect(nextHuge.days[0].stops).toHaveLength(0);
    expect(nextHuge.days[1].stops.map((s) => s.id)).toEqual(["stop-1"]);
  });

  it("preserves total stop count invariant after any move", () => {
    const original = makePlan();
    const totalOriginalStops = original.days.reduce((acc, d) => acc + d.stops.length, 0);

    const moves = [
      ["stop-a", "day-1", 2],
      ["stop-b", "day-2", 0],
      ["stop-d", "day-1", 1],
      ["stop-c", "day-2", 5],
    ];

    let current = original;
    for (const [stopId, toDayId, toIndex] of moves) {
      current = moveStop(current, stopId, toDayId, toIndex);
      const total = current.days.reduce((acc, d) => acc + d.stops.length, 0);
      expect(total).toBe(totalOriginalStops);
    }
  });

  it("moves a stop across days and preserves unaffected day references", () => {
    const original = deepFreeze(makePlan());
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

describe("itineraryReducer REMOVE_STOP", () => {
  it("removes a stop without mutating state and leaves empty day intact", () => {
    const original = deepFreeze(makePlan());
    const next = itineraryReducer(
      { ...initialItineraryState, present: original },
      { type: "REMOVE_STOP", stopId: "stop-d" },
    );

    expect(next.present.days[1].stops).toEqual([]);
    expect(next.present.days[1].id).toBe("day-2");
    expect(next.past).toHaveLength(1);
  });

  it("returns unchanged state when removing a non-existent stopId", () => {
    const original = deepFreeze(makePlan());
    const state = { ...initialItineraryState, present: original };
    const next = itineraryReducer(state, { type: "REMOVE_STOP", stopId: "no-such-stop" });

    expect(next).toBe(state);
  });

  it("can remove the only remaining stop without crashing", () => {
    const singleStopPlan = deepFreeze({
      title: "One stop",
      days: [{ id: "day-1", label: "Day 1", stops: [{ id: "solo" }] }],
    });
    const state = { ...initialItineraryState, present: singleStopPlan };
    const next = itineraryReducer(state, { type: "REMOVE_STOP", stopId: "solo" });

    expect(next.present.days[0].stops).toEqual([]);
    expect(next.past).toHaveLength(1);
  });
});

describe("itineraryReducer UNDO and limits", () => {
  it("undo restores past states and stops when past is empty", () => {
    const original = deepFreeze(makePlan());
    let state = { ...initialItineraryState, present: original };

    state = itineraryReducer(state, { type: "REMOVE_STOP", stopId: "stop-a" });
    expect(state.present.days[0].stops).toHaveLength(2);
    expect(state.past).toHaveLength(1);

    state = itineraryReducer(state, { type: "UNDO" });
    expect(state.present).toBe(original);
    expect(state.past).toHaveLength(0);

    const unchanged = itineraryReducer(state, { type: "UNDO" });
    expect(unchanged).toBe(state);
  });

  it("LOAD resets undo history", () => {
    const original = deepFreeze(makePlan());
    let state = { ...initialItineraryState, present: original };
    state = itineraryReducer(state, { type: "REMOVE_STOP", stopId: "stop-a" });
    expect(state.past).toHaveLength(1);

    const newPlan = { title: "New Trip", days: [] };
    state = itineraryReducer(state, { type: "LOAD", plan: newPlan });
    expect(state.present).toBe(newPlan);
    expect(state.past).toEqual([]);
  });

  it("caps undo history at 20 actions", () => {
    let state = {
      present: {
        days: [{ id: "d1", stops: [{ id: "a" }, { id: "b" }] }],
      },
      past: [],
    };

    for (let i = 0; i < 25; i++) {
      state = itineraryReducer(state, {
        type: "MOVE_STOP",
        stopId: "a",
        toDayId: "d1",
        toIndex: i % 2 === 0 ? 1 : 0,
      });
    }

    expect(state.past.length).toBe(20);
  });
});
