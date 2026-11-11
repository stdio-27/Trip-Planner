import { originSchema, destinationSchema } from "./places.js";
import { CURRENCIES } from "./choices.js";
import { dateBounds } from "./schemas.js";
import { z } from "zod";

export const fareTiers = {
  basic: "Budget",
  standard: "Standard",
  premium: "Comfort",
};
export const modes = z.enum(["train", "flight", "bus", "cab"]);
export const fareSchema = z.object({
  basic: z.number().finite().positive().max(1e9),
  standard: z.number().finite().positive().max(1e9),
  premium: z.number().finite().positive().max(1e9),
  pricing: z.enum(["perPerson", "perVehicle"]),
  flags: z
    .array(z.enum(["unusually_high", "unusually_low"]))
    .max(2)
    .default([]),
});
const point = z.object({ id: z.string(), name: z.string(), kind: z.string() });
const level = z.enum(["scheduled", "route-hint", "unverified"]);
const leg = z.object({
  id: z.string(),
  mode: modes,
  from: point,
  to: point,
  distanceKm: z.number().nonnegative(),
  durationMin: z.number().positive(),
  bufferMin: z.number().nonnegative(),
  note: z.string(),
  availability: z.object({
    level,
    dataYear: z.number().nullable(),
    checkUrl: z.url({ protocol: /^https$/ }).nullable(),
  }),
});
const structure = z.object({
  journeys: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      legs: z.array(leg).min(1),
      totalDurationMin: z.number().positive(),
      changes: z.number().int().nonnegative(),
      modes: z.array(modes),
    }),
  ),
  emptyReason: z.string().nullable(),
});
const fareResponse = z.object({
  fares: z.record(z.string(), fareSchema).nullable(),
  faresError: z.string().nullable(),
});
export const parseJourneys = (body) => structure.safeParse(body);
export const parseFares = (body) => fareResponse.safeParse(body);

export function journeyRequest(trip) {
  return {
    origin: trip.origin,
    destination: trip.destination,
    date: trip.startDate || undefined,
    travelers: { adults: trip.adults, children: trip.children },
    currency: trip.currency,
  };
}

export function createJourneyRequestSchema() {
  return z.strictObject({
    origin: originSchema,
    destination: destinationSchema,
    date: z.iso
      .date()
      .refine((value) => {
        const bounds = dateBounds();
        return value >= bounds.min && value <= bounds.max;
      })
      .optional(),
    travelers: z.strictObject({
      adults: z.number().int().min(1).max(9),
      children: z.number().int().min(0).max(9),
    }),
    currency: z.enum(CURRENCIES),
  });
}
