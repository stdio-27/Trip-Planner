export function validateTripInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, error: "Request body must be a JSON object." };
  }

  for (const field of ["destination", "description"]) {
    if (body[field] !== undefined && typeof body[field] !== "string") {
      return { valid: false, error: `${field} must be a text string.` };
    }
    if (typeof body[field] === "string" && body[field].trim().length > 1000) {
      return { valid: false, error: `${field} cannot exceed 1000 characters.` };
    }
  }
  const destination = typeof body.destination === "string" ? body.destination.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const primaryText = destination || description;

  if (!primaryText) {
    return { valid: false, error: "Destination is required and cannot be empty." };
  }

  if (primaryText.length > 1000) {
    return { valid: false, error: "Destination cannot exceed 1000 characters." };
  }

  let interests = "";
  if (body.interests !== undefined && body.interests !== null && body.interests !== "") {
    if (typeof body.interests !== "string") {
      return { valid: false, error: "Interests must be a text string." };
    }
    interests = body.interests.trim();
    if (interests.length > 500) {
      return { valid: false, error: "Interests cannot exceed 500 characters." };
    }
  }

  let days = 3;
  if (body.days !== undefined && body.days !== null && body.days !== "") {
    const parsedDays = Number(body.days);
    if ((typeof body.days !== "number" && (typeof body.days !== "string" || !body.days.trim())) || !Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > 14) {
      return { valid: false, error: "Trip length must be a whole number between 1 and 14 days." };
    }
    days = parsedDays;
  }

  let currency = "USD";
  if (body.currency !== undefined && body.currency !== null && body.currency !== "") {
    if (typeof body.currency !== "string") {
      return { valid: false, error: "Currency must be a 3-letter currency code." };
    }
    const cleanCurrency = body.currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(cleanCurrency)) {
      return { valid: false, error: "Currency must be a valid 3-letter currency code." };
    }
    currency = cleanCurrency;
  }

  let budget = "";
  if (body.budget !== undefined && body.budget !== null && body.budget !== "") {
    const parsedBudget = Number(body.budget);
    if ((typeof body.budget !== "number" && (typeof body.budget !== "string" || !body.budget.trim())) || !Number.isFinite(parsedBudget) || parsedBudget < 0 || parsedBudget > 1_000_000_000) {
      return { valid: false, error: "Budget must be a non-negative number up to 1,000,000,000." };
    }
    budget = parsedBudget;
  }

  return {
    valid: true,
    data: {
      destination: primaryText,
      ...(description ? { description } : {}),
      days,
      currency,
      ...(budget !== "" ? { budget } : {}),
      ...(interests ? { interests } : {}),
    },
  };
}
