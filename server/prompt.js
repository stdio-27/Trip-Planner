export function buildTripPrompt(tripDetails) {
  return [
    "Create a practical, personalized trip itinerary using the user's trip details.",
    "Return a single JSON object only. Do not include markdown fences or commentary.",
    "Use this exact shape:",
    JSON.stringify({
      title: "string",
      currency: "USD",
      days: [
        {
          label: "Day 1",
          stops: [
            {
              title: "string",
              category: "food | sight | activity | transport | stay | other",
              estCost: 0,
              description: "string",
              location: "string",
              time: "string",
            },
          ],
        },
      ],
      packingList: ["string"],
    }),
    "Use realistic activities and travel times. Do not invent dates, bookings, or prices.",
    "User trip details:",
    JSON.stringify(tripDetails),
  ].join("\n\n");
}
