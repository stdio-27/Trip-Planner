import { z } from "zod";

const categories = ["food", "sight", "activity", "transport", "stay", "other"];

function createId() {
  if (!globalThis.crypto?.randomUUID) {
    throw new Error("crypto.randomUUID() is required to create itinerary IDs.");
  }

  return globalThis.crypto.randomUUID();
}

const categorySchema = z.unknown().transform((value) => {
  if (typeof value !== "string") {
    return "other";
  }

  const normalized = value.trim().toLowerCase();
  return categories.includes(normalized) ? normalized : "other";
});

const estimatedCostSchema = z.unknown().transform((value) => {
  const cost =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(cost) && cost >= 0 ? cost : 0;
});

const stopSchema = z
  .object({
    title: z.string().trim().min(1),
    category: categorySchema,
    estCost: estimatedCostSchema,
    description: z.string().optional(),
    location: z.string().optional(),
    time: z.string().optional(),
  })
  .transform((stop) => ({ ...stop, id: createId() }));

const daySchema = z
  .object({
    label: z.string().trim().min(1),
    stops: z.array(z.unknown()),
  })
  .transform((day) => {
    let droppedItems = 0;
    const stops = [];

    for (const candidate of day.stops) {
      const parsedStop = stopSchema.safeParse(candidate);
      if (parsedStop.success) {
        stops.push(parsedStop.data);
      } else {
        droppedItems += 1;
      }
    }

    return {
      day: { id: createId(), label: day.label, stops },
      droppedItems,
    };
  });

export const tripSchema = z
  .object({
    title: z.string().trim().min(1),
    currency: z.string().trim().min(1),
    days: z.array(daySchema),
    packingList: z.array(z.string().trim().min(1)),
  })
  .transform((trip) => {
    let droppedItems = 0;
    const days = trip.days.map(({ day, droppedItems: dayDroppedItems }) => {
      droppedItems += dayDroppedItems;
      return day;
    });

    const emptyDays = days
      .filter((day) => day.stops.length === 0)
      .map(({ id, label }) => ({ id, label }));

    return { ...trip, days, droppedItems, emptyDays };
  });

export function parsePlan(value) {
  const result = tripSchema.safeParse(value);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, data: result.data };
}

export const parseTripPlan = parsePlan;
