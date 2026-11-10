import { useState } from "react";

export function TripForm({ values, onChange, onSubmit, loading }) {
  const [error, setError] = useState("");

  function update(field, value) {
    if (field === "destination" && error) {
      setError("");
    }
    onChange((current) => ({ ...current, [field]: value }));
  }

  function handleFormSubmit(event) {
    event.preventDefault();
    const cleanDestination = (values.destination || "").trim();
    if (!cleanDestination) {
      setError("Please enter a destination.");
      return;
    }
    setError("");
    const sanitized = {
      ...values,
      destination: cleanDestination,
      interests: (values.interests || "").trim(),
    };
    onChange(sanitized);
    onSubmit(sanitized);
  }

  return (
    <form className="trip-form" onSubmit={handleFormSubmit} noValidate>
      <div className="field-label-row">
        <label htmlFor="destination">Destination</label>
        <span className="char-counter">{(values.destination || "").length}/1000</span>
      </div>
      <input
        id="destination"
        name="destination"
        value={values.destination}
        onChange={(event) => update("destination", event.target.value)}
        placeholder="e.g. Kyoto, Japan"
        autoComplete="address-level2"
        maxLength={1000}
        required
      />
      {error && (
        <p className="form-inline-error" role="alert">
          {error}
        </p>
      )}

      <div className="form-row">
        <div>
          <label htmlFor="trip-days">Trip length</label>
          <input
            id="trip-days"
            name="days"
            type="number"
            min="1"
            max="30"
            value={values.days}
            onChange={(event) => update("days", Number(event.target.value))}
            required
          />
        </div>
        <div>
          <label htmlFor="currency">Currency</label>
          <select
            id="currency"
            name="currency"
            value={values.currency}
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
        value={values.budget}
        onChange={(event) => update("budget", event.target.value)}
        placeholder="e.g. 1500"
      />

      <div className="field-label-row">
        <label htmlFor="interests">Interests (optional)</label>
        <span className="char-counter">{(values.interests || "").length}/500</span>
      </div>
      <textarea
        id="interests"
        name="interests"
        rows="3"
        maxLength={500}
        value={values.interests}
        onChange={(event) => update("interests", event.target.value)}
        placeholder="Food, museums, slow mornings..."
      />

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
