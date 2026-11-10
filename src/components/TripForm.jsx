import { useState } from "react";

const EXAMPLE_CHIPS = [
  { text: "Weekend food tour in Tokyo", days: 2 },
  { text: "3 days exploring temples in Kyoto", days: 3 },
  { text: "5-day cultural trip to Paris", days: 5 },
  { text: "4 days hiking in Vancouver", days: 4 },
];

export function TripForm({ values, onChange, onSubmit, loading }) {
  const [error, setError] = useState("");

  const currentText = values.description ?? values.destination ?? "";

  function update(field, value) {
    if (error && (field === "description" || field === "destination")) {
      setError("");
    }
    onChange((current) => ({ ...current, [field]: value }));
  }

  function handleFormSubmit(event) {
    event.preventDefault();
    const primaryText = currentText.trim();
    if (!primaryText) {
      setError("Please describe the trip you'd like to plan.");
      return;
    }
    const days = Number(values.days);
    const budget = values.budget;
    if (!Number.isInteger(days) || days < 1 || days > 14) {
      setError("Trip length must be a whole number between 1 and 14 days.");
      return;
    }
    if (budget !== "" && (!Number.isFinite(Number(budget)) || Number(budget) < 0 || Number(budget) > 1_000_000_000)) {
      setError("Budget must be a non-negative number up to 1,000,000,000.");
      return;
    }
    setError("");
    const sanitized = {
      ...values,
      days,
      description: primaryText,
      destination: primaryText,
      interests: (values.interests || "").trim(),
    };
    onChange(sanitized);
    onSubmit(sanitized);
  }

  function handleChipClick(chip) {
    setError("");
    onChange((current) => ({ ...current, description: chip.text, destination: chip.text, days: chip.days }));
  }

  return (
    <form className="trip-form" onSubmit={handleFormSubmit} noValidate>
      <div className="field-label-row">
        <label htmlFor="trip-description">Describe your trip</label>
        <span className="char-counter">{currentText.length}/1000</span>
      </div>
      <textarea
        id="trip-description"
        name="description"
        rows="4"
        maxLength={1000}
        value={currentText}
        onChange={(event) => {
          update("description", event.target.value);
          update("destination", event.target.value);
        }}
        placeholder="e.g., A 5-day cultural trip to Kyoto with peaceful mornings, historic temples, and authentic local street food."
        required
      />
      {error && (
        <p className="form-inline-error" role="alert">
          {error}
        </p>
      )}

      <div className="prompt-chips" aria-label="Suggested trip ideas">
        <span className="chips-label">Ideas:</span>
        {EXAMPLE_CHIPS.map((chip) => (
          <button
            key={chip.text}
            type="button"
            className="chip-button"
            onClick={() => handleChipClick(chip)}
          >
            {chip.text}
          </button>
        ))}
      </div>

      <details className="preferences-details">
        <summary className="preferences-summary">
          <span>Preferences</span>
          <span className="preferences-hint">Days, currency, budget (optional)</span>
        </summary>
        <div className="preferences-content">
          <div className="form-row">
            <div>
              <label htmlFor="trip-days">Trip length</label>
              <small id="days-help">This value overrides any duration in your description.</small>
              <input
                id="trip-days"
                aria-describedby="days-help"
                name="days"
                type="number"
                min="1"
                max="14"
                value={values.days ?? 3}
                onChange={(event) =>
                  update("days", event.target.value ? Number(event.target.value) : "")
                }
                placeholder="e.g. 3"
              />
            </div>
            <div>
              <label htmlFor="currency">Currency</label>
              <select
                id="currency"
                name="currency"
                value={values.currency || "USD"}
                onChange={(event) => update("currency", event.target.value)}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
                <option value="JPY">JPY</option>
                <option value="INR">INR</option>
              </select>
            </div>
          </div>

          <label htmlFor="budget">Approximate budget (optional)</label>
          <input
            id="budget"
            name="budget"
            type="number"
            min="0"
            max="1000000000"
            step="1"
            value={values.budget || ""}
            onChange={(event) => update("budget", event.target.value)}
            placeholder="e.g. 1500"
          />
        </div>
      </details>

      <button className="button button-primary submit-button" type="submit" disabled={loading}>
        {loading ? (
          <>
            <span className="button-spinner" aria-hidden="true" />
            Planning your trip…
          </>
        ) : (
          "Generate itinerary"
        )}
      </button>
    </form>
  );
}
