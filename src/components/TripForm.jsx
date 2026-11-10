import { useState } from "react";
import { validateTripInput } from "../../shared/tripInput.js";
const ideas = [
  ["Weekend food tour in Tokyo", 2, "Tokyo"],
  ["3 days exploring temples in Kyoto", 3, "Kyoto"],
  ["5-day cultural trip to Paris", 5, "Paris"],
  ["4 days hiking in Vancouver", 4, "Vancouver"],
];
const interests = [
  "food",
  "history",
  "nature",
  "adventure",
  "nightlife",
  "shopping",
  "relaxation",
  "family-friendly",
];
export function TripForm({
  values,
  onChange,
  onSubmit,
  loading,
  submitLabel = "Generate itinerary",
}) {
  const [error, setError] = useState(null);
  const update = (field, value) =>
    onChange((current) => ({ ...current, [field]: value }));
  function submit(event) {
    event.preventDefault();
    const result = validateTripInput(values);
    if (!result.valid) {
      setError(result);
      return;
    }
    setError(null);
    onChange(current => ({...current,...result.data}));
    onSubmit(result.data);
  }
  function field(name, label, type = "text", maxLength = 100) {
    return (
      <div className="setup-field" key={name}>
        <label htmlFor={name}>{label}</label>
        <input
          id={name}
          type={type}
          maxLength={maxLength}
          value={values[name] ?? ""}
          aria-invalid={error?.field === name}
          aria-describedby={error?.field === name ? "setup-error" : undefined}
          onChange={(e) => update(name, e.target.value)}
        />
      </div>
    );
  }
  return (
    <form className="trip-form" onSubmit={submit} noValidate>
      {field("destination", "Destination")}
      {field("originCity", "Origin city")}
      {field("nearestAirport", "Nearest airport (optional)")}
      {field("nearestStation", "Nearest railway station (optional)")}
      <label htmlFor="trip-days">Trip length</label>
      <select
        id="trip-days"
        value={values.days}
        onChange={(e) => update("days", Number(e.target.value))}
      >
        {Array.from({ length: 14 }, (_, i) => (
          <option key={i} value={i + 1}>
            {i + 1} {i ? "days" : "day"}
          </option>
        ))}
      </select>
      <small>
        {Math.max(Number(values.days) - 1, 0)} nights. This selector determines
        the itinerary length.
      </small>
      {field("startDate", "Start date (optional)", "date")}
      {field("adults", "Adults (1–10)", "number")}
      {field("children", "Children (0–10)", "number")}
      {field("rooms", "Rooms (optional)", "number")}
      <small>
        Default: {Math.ceil(Number(values.adults || 1) / 2)} room(s).
      </small>
      <label htmlFor="currency">Currency</label>
      <select
        id="currency"
        value={values.currency}
        onChange={(e) => update("currency", e.target.value)}
      >
        {[
          "INR",
          "USD",
          "EUR",
          "GBP",
          "AED",
          "SGD",
          "JPY",
          "AUD",
          "CAD",
          "THB",
        ].map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      {field("budget", "Approximate budget (optional)", "number")}
      <label htmlFor="pace">Travel pace</label>
      <select
        id="pace"
        value={values.pace}
        onChange={(e) => update("pace", e.target.value)}
      >
        {["relaxed", "balanced", "packed"].map((p) => (
          <option key={p}>{p}</option>
        ))}
      </select>
      <fieldset>
        <legend>Interests</legend>
        <div className="prompt-chips">
          {interests.map((item) => (
            <button
              className="chip-button"
              type="button"
              key={item}
              aria-pressed={(values.interests || "").split(", ").includes(item)}
              onClick={() => {
                const current = (values.interests || "")
                  .split(", ")
                  .filter(Boolean);
                update(
                  "interests",
                  (current.includes(item)
                    ? current.filter((x) => x !== item)
                    : [...current, item]
                  ).join(", "),
                );
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </fieldset>
      <label htmlFor="anythingElse">Anything else about your trip?</label>
      <textarea
        id="anythingElse"
        maxLength={500}
        value={values.anythingElse}
        onChange={(e) => update("anythingElse", e.target.value)}
      />
      <label htmlFor="foodPreference">Food preference</label>
      <select
        id="foodPreference"
        value={values.foodPreference}
        onChange={(e) => update("foodPreference", e.target.value)}
      >
        {["no preference", "vegetarian", "vegan", "halal", "other"].map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
      {values.foodPreference === "other" &&
        field("foodOther", "Other food preference", "text", 50)}
      <div className="prompt-chips">
        {ideas.map(([text, days, destination]) => (
          <button
            className="chip-button"
            type="button"
            key={text}
            onClick={() =>
              onChange((current) => ({
                ...current,
                destination,
                description: "",
                days,
              }))
            }
          >
            {text}
          </button>
        ))}
      </div>
      {error && (
        <p id="setup-error" className="form-inline-error" role="alert">
          {error.error}
        </p>
      )}
      <button className="button button-primary" disabled={loading}>
        {loading ? "Planning your trip…" : submitLabel}
      </button>
    </form>
  );
}
