import { Skeleton } from "../common/Skeleton.jsx";
import { ErrorState } from "../common/ErrorState.jsx";
import { EmptyState, EmptyHint } from "../common/EmptyStates.jsx";
import { ItineraryView } from "./ItineraryView.jsx";
import { PackingList } from "./PackingList.jsx";
export function ItineraryStep({
  buildPlan,
  canUndo,
  cancel,
  error,
  showEmptyHint,
  packing,
  plan,
  planRetryAfter,
  resultsPanel,
  setPacking,
  status,
  step,
  stepHeading,
  onRemove,
  onMove,
  onUndo,
}) {
  return (
    <section
      className="results-panel"
      ref={resultsPanel}
      tabIndex={-1}
      aria-label="Itinerary results"
      aria-live="polite"
    >
      {step === 3 && status === "loading" && (
        <div className="loading-view">
          <h2 ref={stepHeading} tabIndex={-1}>
            Building your itinerary
          </h2>
          <div className="loading-actions">
            <button
              type="button"
              className="button button-secondary cancel-button"
              onClick={cancel}
            >
              Cancel
            </button>
          </div>
          <Skeleton />
        </div>
      )}
      {step === 3 && status === "error" && (
        <ErrorState
          message={error}
          onRetry={buildPlan}
          loading={planRetryAfter > 0}
        />
      )}
      {step === 3 && status === "empty" && <EmptyState onRetry={buildPlan} />}
      {showEmptyHint && <EmptyHint />}
      {step === 3 && plan && (
        <>
          <div className="results-heading">
            <div>
              <div className="section-eyebrow">YOUR ITINERARY</div>
              <h2 tabIndex={-1}>{plan.title}</h2>
            </div>
            <button
              type="button"
              className="button button-secondary undo-button"
              onClick={onUndo}
              disabled={!canUndo}
              aria-label="Undo the last itinerary change"
            >
              Undo
            </button>
          </div>

          <ItineraryView
            days={plan.days}
            currency={plan.currency}
            onRemove={onRemove}
            onMove={onMove}
          />
          <PackingList
            items={plan.packingList}
            packing={packing}
            onChange={setPacking}
          />
          {plan.droppedItems > 0 && (
            <p className="dropped-note" role="status">
              {plan.droppedItems} invalid{" "}
              {plan.droppedItems === 1 ? "stop was" : "stops were"} skipped.
            </p>
          )}
        </>
      )}
    </section>
  );
}
