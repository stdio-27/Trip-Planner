import { expect, it } from "vitest";
import {
  computeCostBreakdown,
  formatMoney,
  presetSelections,
} from "./costs.js";
const selections = {
  travelOptions: {
    farePerPersonRoundTrip: 100,
    originTransferPerPersonRoundTrip: 10,
    destinationTransferPerPersonRoundTrip: 20,
  },
  stayOptions: { pricePerRoomPerNight: 200 },
  localTransportOptions: { pricing: "perPerson", pricePerDay: 10 },
  foodOptions: { dailyPerPerson: 30 },
};
it("computes kids, room override, each category and contingency", () => {
  const c = computeCostBreakdown({
    selections,
    travelers: { adults: 2, children: 1 },
    days: 3,
    rooms: 2,
    activitiesTotal: 5,
    contingencyOn: true,
  });
  expect(c).toMatchObject({
    travel: 390,
    stay: 800,
    local: 90,
    food: 270,
    activities: 15,
    contingency: 156.5,
    total: 1721.5,
  });
});
it("uses per-group transport and no stay for one day", () => {
  const c = computeCostBreakdown({
    selections: {
      ...selections,
      localTransportOptions: { pricing: "perGroup", pricePerDay: 10 },
    },
    travelers: { adults: 2, children: 0 },
    days: 1,
    rooms: 1,
  });
  expect(c.local).toBe(10);
  expect(c.stay).toBe(0);
});
it("handles empty choices, zero days and zero travelers", () => {
  expect(
    computeCostBreakdown({ travelers: { adults: 0, children: 0 } }),
  ).toMatchObject({ total: 0, perDay: 0, perPerson: 0 });
});
it("formats JPY without decimal places and INR normally", () => {
  expect(formatMoney(123.5, "JPY")).not.toContain(".5");
  expect(formatMoney(123.5, "INR")).toContain("123.50");
});
it("uses edited prices in presets without mutating options", () => {
  const options = {
    stayOptions: [
      { id: "a", pricePerRoomPerNight: 100 },
      { id: "b", pricePerRoomPerNight: 1 },
    ],
  };
  expect(presetSelections(options, "Cheapest combo").stayOptions).toBe("b");
  expect(options.stayOptions[0].id).toBe("a");
});
it("compares local transport using group size rather than sticker price", () => {
  const options = {
    localTransportOptions: [
      { id: "per-person", pricing: "perPerson", pricePerDay: 100 },
      { id: "group", pricing: "perGroup", pricePerDay: 200 },
    ],
  };
  expect(
    presetSelections(options, "Cheapest combo", {
      days: 3,
      travelers: { adults: 4, children: 0 },
    }).localTransportOptions,
  ).toBe("group");
});
