import { useState } from "react";

const EXAMPLE_CHIPS = [
  "Weekend food tour in Tokyo",
  "3 days exploring temples in Kyoto",
  "5-day cultural trip to Paris",
  "4 days hiking in Vancouver",
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
    setError("");
    const sanitized = {
      ...values,
      description: primaryText,
      destination: primaryText,
      interests: (values.interests || "").trim(),
    };
    onChange(sanitized);
    onSubmit(sanitized);
  }

  function handleChipClick(chipText) {
    update("description", chipText);
    update("destination", chipText);
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
            key={chip}
            type="button"
            className="chip-button"
            onClick={() => handleChipClick(chip)}
          >
            {chip}
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
              <input
                id="trip-days"
                name="days"
                type="number"
                min="1"
                max="30"
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
