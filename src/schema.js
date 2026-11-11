import { z } from "zod";
import { planEnvelopeSchema } from "../shared/planSchema.js";

const categories = ["food", "sight", "activity", "transport", "stay", "other"];

function createId() {
  if (!globalThis.crypto?.randomUUID) {
    throw new Error("crypto.randomUUID() is required to create itinerary IDs.");
  }

  return globalThis.crypto.randomUUID();
}

const categorySchema = z
  .unknown()
  .optional()
  .transform((value) => {
    if (typeof value !== "string") {
      return "other";
    }

    const normalized = value.trim().toLowerCase();
    return categories.includes(normalized) ? normalized : "other";
  });

const estimatedCostSchema = z
  .unknown()
  .optional()
  .transform((value) => {
    const cost =
      typeof value === "number"
        ? value
        : typeof value === "string" && value.trim()
          ? Number(value)
          : Number.NaN;

    return Number.isFinite(cost) && cost >= 0 ? cost : 0;
  });

const optionalStringSchema = z
  .unknown()
  .optional()
  .transform((value) => {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    return undefined;
  });

const stopSchema = z
  .object({
    title: z.string().trim().min(1),
    category: categorySchema,
    estCost: estimatedCostSchema,
    description: optionalStringSchema,
    location: optionalStringSchema,
    time: optionalStringSchema,
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
    packingList: z
      .array(z.unknown())
      .nullish()
      .transform((rawList) => {
        if (!Array.isArray(rawList)) return [];
        const items = [];
        for (const candidate of rawList) {
          const text =
            typeof candidate === "string"
              ? candidate.trim()
              : candidate && typeof candidate === "object" && "text" in candidate && typeof candidate.text === "string"
                ? candidate.text.trim()
                : "";
          if (text) {
            items.push({ id: createId(), text });
          }
        }
        return items;
      }),
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
  const envelope = planEnvelopeSchema.safeParse(value);
  if (!envelope.success) return { success: false, error: envelope.error };
  const result = tripSchema.safeParse(envelope.data);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, data: result.data };
}

export const parseTripPlan = parsePlan;
