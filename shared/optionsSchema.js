import { z } from "zod";
const price = z
  .unknown()
  .default(0)
  .transform((v) => {
    const n = typeof v === "number" || typeof v === "string" ? Number(v) : NaN;
    return Number.isFinite(n) && n >= 0 && n <= 1e9 ? n : 0;
  });
const text = z.string().trim().max(1000);
const base = { label: text.min(1), notes: text.default("") };
export const optionSchemas = {
  travelOptions: z.object({
    ...base,
    mode: z
      .enum(["flight", "train", "bus", "car", "cab", "other"])
      .catch("other"),
    comfort: z.enum(["basic", "standard", "premium"]).catch("standard"),
    durationHours: price,
    farePerPersonRoundTrip: price,
    originTransferPerPersonRoundTrip: price,
    destinationTransferPerPersonRoundTrip: price,
  }),
  stayOptions: z.object({
    ...base,
    tier: z.enum(["budget", "mid", "premium"]).catch("mid"),
    type: z
      .enum(["hostel", "hotel", "resort", "homestay", "other"])
      .catch("other"),
    area: text.default(""),
    pricePerRoomPerNight: price,
  }),
  localTransportOptions: z.object({
    ...base,
    pricing: z.enum(["perPerson", "perGroup"]).catch("perPerson"),
    pricePerDay: price,
  }),
  foodOptions: z.object({
    ...base,
    tier: z.enum(["budget", "mid", "premium"]).catch("mid"),
    dailyPerPerson: price,
  }),
};
const hub = z.object({
  name: text.default(""),
  code: text.default(""),
  distanceKmToCity: price.optional(),
});
const schema = z.object({
  currency: z.string().regex(/^[A-Z]{3}$/),
  assumptions: z.array(text).max(30).default([]),
  origin: z.object({ city: text, nearestAirport: hub, nearestStation: hub }),
  destination: z.object({
    city: text,
    arrivalAirport: hub,
    arrivalStation: hub,
  }),
  ...Object.fromEntries(
    Object.keys(optionSchemas).map((k) => [
      k,
      z.array(z.unknown()).max(20).default([]),
    ]),
  ),
});
export const groups = Object.keys(optionSchemas);
export const priceFields = {
  travelOptions: [
    "farePerPersonRoundTrip",
    "originTransferPerPersonRoundTrip",
    "destinationTransferPerPersonRoundTrip",
  ],
  stayOptions: ["pricePerRoomPerNight"],
  localTransportOptions: ["pricePerDay"],
  foodOptions: ["dailyPerPerson"],
};
export function parseOptions(raw) {
  const result = schema.safeParse(raw);
  if (!result.success) return result;
  const data = result.data;
  for (const key of groups) {
    data[key] = data[key].flatMap((value) => {
      const item = optionSchemas[key].safeParse(value);
      return item.success ? [{ ...item.data, id: crypto.randomUUID() }] : [];
    });
    if (!data[key].length)
      data[key] = [
        {
          ...optionSchemas[key].parse({
            label: "Custom",
            notes: "Enter your own estimate.",
            mode: "other",
            comfort: "standard",
            tier: "mid",
            type: "other",
            area: "",
            pricing: "perPerson",
          }),
          id: crypto.randomUUID(),
        },
      ];
  }
  return { success: true, data };
}
