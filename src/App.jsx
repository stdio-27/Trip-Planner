import { useState } from "react";
import { BudgetSummary } from "./components/BudgetSummary.jsx";
import { EmptyHint, EmptyState } from "./components/EmptyStates.jsx";
import { ErrorState } from "./components/ErrorState.jsx";
import { ItineraryView } from "./components/ItineraryView.jsx";
import { PackingList } from "./components/PackingList.jsx";
import { Skeleton } from "./components/Skeleton.jsx";
import { TripForm } from "./components/TripForm.jsx";
import { useGenerate } from "./hooks/useGenerate.js";
import { useItinerary } from "./hooks/useItinerary.js";

const initialForm = {
  destination: "",
  days: 3,
  budget: "",
  currency: "USD",
  interests: "",
};

export default function App() {
  const [formValues, setFormValues] = useState(initialForm);
  const { status, plan: generatedPlan, error, generate } = useGenerate();
  const { plan, dispatch, canUndo } = useItinerary(generatedPlan);

  function handleSubmit(event) {
    event.preventDefault();
    generate(formValues);
  }

  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Trip Planner home">
          <span className="brand-mark" aria-hidden="true">T</span>
          <span>Trip Planner</span>
        </a>
        <p>Thoughtful trips, made simple.</p>
      </header>

      <section className="planner-layout" aria-label="Trip planner">
        <aside className="form-panel">
          <div className="section-eyebrow">YOUR NEXT ADVENTURE</div>
          <h1>Plan a trip</h1>
          <p className="muted-copy">Tell us a little about where you want to go.</p>
          <TripForm
            values={formValues}
            onChange={setFormValues}
            onSubmit={handleSubmit}
            loading={status === "loading"}
          />
        </aside>

        <section className="results-panel" aria-live="polite">
          {status === "loading" && <Skeleton />}
          {status === "error" && (
            <ErrorState
              message={error}
              onRetry={() => generate(formValues)}
              loading={status === "loading"}
            />
          )}
          {status === "empty" && <EmptyState />}
          {status === "idle" && !plan && <EmptyHint />}
          {status === "success" && plan && (
            <>
              <div className="results-heading">
                <div>
                  <div className="section-eyebrow">YOUR ITINERARY</div>
                  <h2>{plan.title}</h2>
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
              <BudgetSummary plan={plan} />
              <ItineraryView plan={plan} dispatch={dispatch} />
              <PackingList items={plan.packingList} />
              {plan.droppedItems > 0 && (
                <p className="dropped-note" role="status">
                  {plan.droppedItems} invalid {plan.droppedItems === 1 ? "stop was" : "stops were"} skipped.
                </p>
              )}
            </>
          )}
        </section>
      </section>
    </main>
  );
}
