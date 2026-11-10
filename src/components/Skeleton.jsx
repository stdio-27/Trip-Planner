export function Skeleton() {
  return (
    <div className="skeleton-panel" role="status" aria-label="Generating itinerary">
      <span className="sr-only">Generating your itinerary…</span>
      <div className="skeleton-line skeleton-title" />
      <div className="skeleton-line skeleton-short" />
      <div className="skeleton-summary">
        <div className="skeleton-line" />
        <div className="skeleton-line" />
        <div className="skeleton-line" />
      </div>
      <div className="skeleton-line skeleton-subtitle" />
      <div className="skeleton-card" />
      <div className="skeleton-card" />
    </div>
  );
}
