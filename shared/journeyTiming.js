import { z } from "zod";

export const timeBuckets = ["morning", "afternoon", "evening", "night"];
export const timeBucketSchema = z.enum(timeBuckets);
const startHour = { morning: 8, afternoon: 13, evening: 18, night: 22 };

export const journeySummarySchema = z.strictObject({
  id: z.string().min(1).max(64),
  hubs: z.array(z.string().min(1).max(32)).max(8),
  roundTrip: z.boolean(),
  arrival: timeBucketSchema,
  leaveBy: timeBucketSchema.nullable(),
});

export function routeHubs(route) {
  return [...new Set(route.legs.flatMap(({ from, to }) => [from, to])
    .filter(({ kind }) => kind === "station" || kind === "airport")
    .map(({ id }) => id))];
}

export function journeyTiming(route, departure, returnPreference, roundTrip) {
  const elapsed = startHour[departure] * 60 + route.totalDurationMin;
  const arrivalMinute = elapsed % 1440;
  const hour = Math.floor(arrivalMinute / 60);
  const arrival = hour < 5 || hour >= 21 ? "night"
    : hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  return {
    arrival,
    arrivalDay: Math.floor(elapsed / 1440) + 1,
    arrivalMinute,
    leaveBy: roundTrip ? returnPreference : null,
    leaveByMinute: roundTrip ? startHour[returnPreference] * 60 : null,
  };
}

export function clockTime(minutes) {
  return [Math.floor(minutes / 60), minutes % 60].map((part) => String(part).padStart(2, "0")).join(":");
}
