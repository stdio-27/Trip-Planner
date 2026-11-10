function validateBase(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, error: "Request body must be a JSON object." };
  }

  for (const field of ["destination", "description"]) {
    if (body[field] !== undefined && typeof body[field] !== "string") {
      return { valid: false, error: `${field} must be a text string.` };
    }
    if (typeof body[field] === "string" && body[field].trim().length > 100) {
      return { valid: false, error: `${field} cannot exceed 100 characters.` };
    }
  }
  const destination = typeof body.destination === "string" ? body.destination.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const primaryText = destination || description;

  if (!primaryText) {
    return { valid: false, error: "Destination is required and cannot be empty." };
  }

  if (primaryText.length > 100) {
    return { valid: false, error: "Destination cannot exceed 100 characters." };
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

  let currency = "INR";
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

export function validateTripInput(body, today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })) {
  const base = validateBase(body);
  if (!base.valid) return base;
  const data = { ...base.data };
  for (const [field, limit, required] of [["originCity",100,true],["nearestAirport",100,false],["nearestStation",100,false],["anythingElse",500,false],["foodOther",50,false]]) {
    const value = body[field] ?? "";
    if (typeof value !== "string" || value.trim().length > limit || (required && !value.trim())) return { valid:false, error:`${field} ${required ? "is required and " : ""}must be text up to ${limit} characters.`, field };
    data[field] = value.trim();
  }
  for (const [field,min,max,fallback] of [["adults",1,10,1],["children",0,10,0],["rooms",1,20,Math.ceil(Number(body.adults || 1)/2)]]) {
    const raw = body[field] === "" || body[field] == null ? fallback : body[field];
    const value = Number(raw);
    if (!["string","number"].includes(typeof raw) || !String(raw).trim() || !Number.isInteger(value) || value < min || value > max) return { valid:false,error:`${field} must be a whole number between ${min} and ${max}.`,field };
    data[field] = value;
  }
  for (const [field,allowed,fallback] of [["pace",["relaxed","balanced","packed"],"balanced"],["foodPreference",["no preference","vegetarian","vegan","halal","other"],"no preference"]]) {
    data[field] = body[field] ?? fallback;
    if (!allowed.includes(data[field])) return {valid:false,error:`Invalid ${field}.`,field};
  }
  if (data.foodPreference === "other" && !data.foodOther) return {valid:false,error:"Describe your food preference.",field:"foodOther"};
  data.startDate = body.startDate ?? "";
  if (data.startDate && (typeof data.startDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.startDate) || Number.isNaN(Date.parse(data.startDate)) || new Date(data.startDate).toISOString().slice(0,10) !== data.startDate || data.startDate < today)) return {valid:false,error:"Start date must be a real date today or later.",field:"startDate"};
  return {valid:true,data};
}
