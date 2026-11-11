export function EmptyHint() {
  return (
    <div className="empty-panel">
      <div className="empty-illustration" aria-hidden="true">✦</div>
      <h2 tabIndex={-1}>Your next trip starts here</h2>
      <p>Add a destination and a few preferences. Your itinerary will appear here.</p>
    </div>
  );
}

export function EmptyState({ onRetry }) {
  return (
    <div className="empty-panel" role="status">
      <div className="empty-illustration" aria-hidden="true">↗</div>
      <h2 tabIndex={-1}>No itinerary to show yet</h2>
      <p>Try another destination or adjust your trip details.</p>
      {onRetry && <button className="button" onClick={onRetry}>Try again</button>}
    </div>
  );
}
