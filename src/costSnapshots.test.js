import { expect, it } from "vitest";
import { computeCostBreakdown } from "./lib/costs.js";
const route = {
  legs: [{ id: "cab", mode: "cab", from: { name: "A" }, to: { name: "B" } }],
};
const fares = {
  cab: { basic: 100, standard: 150, premium: 200, pricing: "perVehicle" },
};
const selections = {
  stayOptions: { pricePerRoomPerNight: 200 },
  localTransportOptions: { pricePerDay: 10, pricing: "perPerson" },
  foodOptions: { dailyPerPerson: 30 },
};
it("characterizes five fixed cost inputs before refactoring", () => {
  const inputs = [
    {},
    { selections, travelers: { adults: 2, children: 1 }, days: 3, rooms: 2 },
    {
      selections,
      travelers: { adults: 1, children: 0 },
      days: 1,
      contingencyOn: true,
    },
    {
      journey: { route, fares, tier: "basic", roundTrip: true },
      travelers: { adults: 2, children: 3 },
    },
    {
      journey: {
        route,
        fares,
        tier: "premium",
        roundTrip: false,
        edits: { "cab:premium": "75" },
      },
      travelers: { adults: 3, children: 2 },
    },
  ];
  expect(inputs.map(computeCostBreakdown)).toMatchSnapshot();
});
