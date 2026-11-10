import { originSchema, destinationSchema } from "./places.js";
import { z } from "zod";
import { optionSchemas } from "./optionsSchema.js";
import { CURRENCIES, PACES, FOOD_PREFERENCES, INTERESTS } from "./choices.js";
export * from "./choices.js";
export const cleanText = (text) =>
  text
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const place = z.string().transform(cleanText).pipe(z.string().min(1).max(100));
const optionalText = (max) =>
  z.string().transform(cleanText).pipe(z.string().max(max)).default("");
export function dateBounds(
  today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
) {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 365);
  return { min: today, max: date.toISOString().slice(0, 10) };
}
function createSetupFields(today = dateBounds().min) {
  const bounds = dateBounds(today);
  return z
    .object({
      destination: place,
      originCity: place,
      nearestAirport: optionalText(100),
      nearestStation: optionalText(100),
      days: z.number().int().min(1).max(14),
      adults: z.number().int().min(1).max(9).default(1),
      children: z.number().int().min(0).max(9).default(0),
      rooms: z.number().int().min(1).max(9).optional(),
      budget: z.number().int().min(0).max(10000000).optional(),
      currency: z
        .enum(CURRENCIES)
        .refine((c) => Intl.supportedValuesOf("currency").includes(c))
        .default("INR"),
      startDate: z
        .string()
        .refine(
          (s) =>
            s === "" ||
            (/^\d{4}-\d{2}-\d{2}$/.test(s) &&
              !Number.isNaN(Date.parse(s)) &&
              new Date(s).toISOString().slice(0, 10) === s &&
              s >= bounds.min &&
              s <= bounds.max),
          "Choose a real date between today and 365 days from today.",
        )
        .default(""),
      pace: z.enum(PACES).default("balanced"),
      foodPreference: z.enum(FOOD_PREFERENCES).default("no preference"),
      foodOther: optionalText(50),
      interests: z.array(z.enum(INTERESTS)).max(INTERESTS.length).default([]),
      anythingElse: optionalText(300),
    })
    .strict();
}
function checkFood(data, ctx) {
  if (data.foodPreference === "other" && !data.foodOther)
    ctx.addIssue({
      code: "custom",
      path: ["foodOther"],
      message: "Describe the other food preference.",
    });
}
export function createTripSetupSchema(today) {
  return createSetupFields(today).superRefine(checkFood);
}
export function createPickedTripSchema(today) {
  return createSetupFields(today)
    .omit({
      destination: true,
      originCity: true,
      nearestAirport: true,
      nearestStation: true,
    })
    .safeExtend({ origin: originSchema, destination: destinationSchema })
    .superRefine(checkFood);
}
export const tripSetupSchema = createTripSetupSchema();
export const pickedTripSchema = createPickedTripSchema();
/** @typedef {z.output<typeof tripSetupSchema>} TripSetup */
export function requestSchema(today, picked = false) {
  return (
    picked ? createPickedTripSchema(today) : createTripSetupSchema(today)
  ).safeExtend({
    selections: z
      .object({
        stayOptions: optionSchemas.stayOptions,
        localTransportOptions: optionSchemas.localTransportOptions,
        foodOptions: optionSchemas.foodOptions,
      })
      .strict()
      .optional(),
  });
}
/** Convert only canonical digit strings from form controls; API schemas never coerce. */
export function formPayload(values) {
  const data = { ...values };
  for (const field of ["days", "adults", "children", "rooms", "budget"]) {
    const v = data[field];
    if ((field === "rooms" || field === "budget") && v === "")
      delete data[field];
    else if (typeof v === "string" && /^\d+$/.test(v)) data[field] = Number(v);
  }
  return data;
}
