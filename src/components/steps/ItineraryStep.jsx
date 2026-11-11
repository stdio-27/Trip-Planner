import { Skeleton } from "../Skeleton.jsx";
import { ErrorState } from "../ErrorState.jsx";
import { EmptyState, EmptyHint } from "../EmptyStates.jsx";
import { ItineraryView } from "../ItineraryView.jsx";
import { PackingList } from "../PackingList.jsx";
export function ItineraryStep({ model }) {
  const {
    buildPlan,
    canUndo,
    cancel,
    dispatch,
    error,
    optionsCall,
    packing,
    plan,
    planRetryAfter,
    planTrip,
    resultsPanel,
    setPacking,
    status,
    step,
    stepHeading,
    trip,
  } = model;
  return (
    <>
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
        {status === "idle" &&
          !plan &&
          step === 1 &&
          optionsCall.status === "idle" && <EmptyHint />}
        {step === 3 && planTrip === trip && plan && (
          <>
            <div className="results-heading">
              <div>
                <div className="section-eyebrow">YOUR ITINERARY</div>
                <h2 tabIndex={-1}>{plan.title}</h2>
              </div>
              <button
                type="button"
                className="button button-secondary undo-button"
                onClick={() => dispatch({ type: "UNDO" })}
                disabled={!canUndo}
                aria-label="Undo the last itinerary change"
              >
                Undo
              </button>
            </div>

            <ItineraryView plan={plan} dispatch={dispatch} />
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
    </>
  );
}
