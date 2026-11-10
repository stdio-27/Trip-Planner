export function TripForm({ values, onChange, onSubmit, loading }) {
  function update(field, value) {
    onChange((current) => ({ ...current, [field]: value }));
  }

  return (
    <form className="trip-form" onSubmit={onSubmit}>
      <label htmlFor="destination">Destination</label>
      <input
        id="destination"
        name="destination"
        value={values.destination}
        onChange={(event) => update("destination", event.target.value)}
        placeholder="e.g. Kyoto, Japan"
        autoComplete="address-level2"
        required
      />

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
        step="1"
        value={values.budget}
        onChange={(event) => update("budget", event.target.value)}
        placeholder="e.g. 1500"
      />

      <label htmlFor="interests">Interests (optional)</label>
      <textarea
        id="interests"
        name="interests"
        rows="3"
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
