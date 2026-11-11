import { JourneyStep } from "../JourneyStep.jsx";
import { OptionsPicker, CostPanel } from "../OptionsPicker.jsx";
import { clockTime } from "../../../shared/journeyTiming.js";
export function OptionsStep({ model }) {
  const {
    buildPlan,
    cancel,
    choice,
    contingencyOn,
    fareData,
    fares,
    journeyInput,
    journeyNotice,
    journeys,
    options,
    plan,
    planRetryAfter,
    planTrip,
    route,
    selected,
    setChoice,
    setContingencyOn,
    setOptions,
    setSelected,
    setStep,
    stale,
    status,
    step,
    stepHeading,
    timing,
    trip,
  } = model;
  return (
    <>
      {step > 1 && options && (
        <>
          <button
            className="button"
            onClick={() => {
              cancel();
              setStep(1);
            }}
          >
            Back to trip details
          </button>
          {stale && (
            <p role="alert">Trip details changed. Regenerate options</p>
          )}
          <JourneyStep
            trip={trip}
            journeys={
              journeys.status === "loading" || journeys.status === "error"
                ? { ...journeys, plan: null }
                : journeys
            }
            fares={
              fares.status !== "success" ? { ...fares, plan: null } : fares
            }
            choice={choice}
            setChoice={setChoice}
            notice={journeyNotice}
            onChangeHubs={() => setStep(1)}
            retryRoutes={() => journeys.generate(journeyInput.current)}
            retryFares={() => fares.generate(journeyInput.current)}
            renderTiming={() =>
              timing && (
                <p role="status">
                  Approximate arrival: Day {timing.arrivalDay}, {timing.arrival}{" "}
                  ({clockTime(timing.arrivalMinute)}).
                  {timing.leaveBy &&
                    ` Leave by Day ${trip.days}, ${timing.leaveBy} (${clockTime(timing.leaveByMinute)}).`}
                  {(timing.arrivalDay > trip.days ||
                    (timing.leaveBy &&
                      timing.arrivalDay === trip.days &&
                      timing.arrivalMinute >= timing.leaveByMinute)) &&
                    " The selected timing leaves no activity time at the destination."}
                </p>
              )
            }
          />
          <OptionsPicker
            headingRef={step === 2 ? stepHeading : undefined}
            options={options}
            setOptions={setOptions}
            selected={selected}
            setSelected={setSelected}
            trip={trip}
          />
          <CostPanel
            options={options}
            selected={selected}
            trip={trip}
            journey={{ ...choice, route, fares: fareData }}
            activitiesTotal={
              planTrip === trip && plan
                ? plan.days
                    .flatMap((d) => d.stops)
                    .reduce((sum, s) => sum + s.estCost, 0)
                : 0
            }
            contingencyOn={contingencyOn}
            setContingencyOn={setContingencyOn}
          />
          <button
            className="button button-primary"
            disabled={
              stale || !route || status === "loading" || planRetryAfter > 0
            }
            onClick={buildPlan}
          >
            Build my itinerary
          </button>
        </>
      )}
    </>
  );
}
