import { TripForm } from "../TripForm.jsx";
import { Skeleton } from "../Skeleton.jsx";
import { ErrorState } from "../ErrorState.jsx";
import { EmptyState } from "../EmptyStates.jsx";
export function SetupStep({ model }) {
  const {
    formValues,
    handleSubmit,
    optionsCall,
    pendingTrip,
    setFormValues,
    stale,
    step,
    stepHeading,
  } = model;
  return (
    <>
      {step === 1 && stale && (
        <p role="alert">Trip details changed. Regenerate options</p>
      )}
      {step === 1 && (
        <aside className="form-panel">
          <div className="section-eyebrow">YOUR NEXT ADVENTURE</div>
          <h2 ref={stepHeading} tabIndex={-1}>
            Plan a trip
          </h2>
          <p className="muted-copy">
            Tell us a little about where you want to go.
          </p>
          <TripForm
            values={formValues}
            onChange={setFormValues}
            onSubmit={handleSubmit}
            loading={optionsCall.status === "loading"}
            disabled={optionsCall.retryAfter > 0}
            submitLabel="Explore options"
            serverErrors={optionsCall.fieldErrors}
          />
        </aside>
      )}
      {optionsCall.status === "loading" && (
        <div>
          <button className="button" onClick={optionsCall.cancel}>
            Cancel
          </button>
          <Skeleton />
        </div>
      )}
      {optionsCall.status === "error" && (
        <ErrorState
          message={optionsCall.error}
          loading={optionsCall.retryAfter > 0}
          onRetry={() => optionsCall.generate(pendingTrip.current)}
        />
      )}
      {optionsCall.status === "empty" && (
        <EmptyState onRetry={() => optionsCall.generate(pendingTrip.current)} />
      )}
    </>
  );
}
