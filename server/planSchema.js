import { z } from "zod";
import { planEnvelopeSchema } from "../shared/planSchema.js";

const stop = z.object({
  title: z.string().trim().min(1).max(500),
  category: z.enum(["food", "sight", "activity", "transport", "stay", "other"]),
  estCost: z.number().finite().min(0).max(1_000_000_000),
  description: z.string().max(5000).optional(),
  location: z.string().max(1000).optional(),
  time: z.string().max(100).optional(),
});
const generatedPlanSchema = planEnvelopeSchema.extend({
  days: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(200),
        stops: z.array(stop).max(5),
      }),
    )
    .max(14),
  packingList: z.array(z.string().trim().min(1).max(500)).max(200),
});

export function validateGeneratedPlan(value, request) {
  const result = generatedPlanSchema.safeParse(value);
  if (!result.success) return result;
  if (result.data.days.some((day, index) => day.label !== `Day ${index + 1}`))
    return { success: /** @type {const} */ (false) };
  if (
    result.data.currency !== request.currency ||
    (result.data.days.length !== 0 && result.data.days.length !== request.days)
  ) {
    return { success: /** @type {const} */ (false) };
  }
  return result;
}
