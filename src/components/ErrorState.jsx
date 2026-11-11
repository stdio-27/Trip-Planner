export function ErrorState({ message, onRetry, loading = false }) {
  return (
    <div className="error-panel" role="alert">
      <div className="error-icon" aria-hidden="true">!</div>
      <div>
        <h2 tabIndex={-1}>We couldn’t make that itinerary</h2>
        <p>{message || "Something went wrong. Please try again."}</p>
        <button className="button button-secondary" type="button" onClick={onRetry} disabled={loading}>
          Try again
        </button>
      </div>
    </div>
  );
}
