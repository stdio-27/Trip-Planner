import { requestSchema } from "./schemas.js";
import { groups, priceFields } from "./optionsSchema.js";
/** @param {unknown} body @param {string} [today] */
export function validateTripInput(body, today) {
  const result = requestSchema(
    today,
    !!body && typeof body === "object" && "origin" in body,
  ).safeParse(body);
  if (!result.success) {
    const errors = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] || "form");
      errors[key] ??= issue.message;
    }
    return {
      valid: false,
      errors,
      error: Object.values(errors)[0],
      field: Object.keys(errors)[0],
    };
  }
  const data = result.data;
  // Model-output salvage is permissive; user-submitted estimates are strict.
  if (data.selections)
    for (const group of groups)
      for (const field of priceFields[group]) {
        const amount = body["selections"]?.[group]?.[field];
        if (
          typeof amount !== "number" ||
          !Number.isFinite(amount) ||
          amount < 0 ||
          amount > 1e9
        )
          return {
            valid: false,
            errors: { selections: `Invalid ${field} estimate.` },
            error: `Invalid ${field} estimate.`,
            field: "selections",
          };
      }
  return {
    valid: true,
    data: { ...data, rooms: data.rooms ?? Math.ceil(data.adults / 2) },
  };
}
