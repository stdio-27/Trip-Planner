import { useServerMode } from "./hooks/useServerMode.js";
import { clockTime, journeyTiming, routeHubs } from "../shared/journeyTiming.js";
import { useEffect, useState, useRef } from "react";
import { BuzzIntro, BuzzOutro } from "./components/BuzzLanding.jsx";
import { EmptyHint, EmptyState } from "./components/EmptyStates.jsx";
import { ErrorState } from "./components/ErrorState.jsx";
import { ItineraryView } from "./components/ItineraryView.jsx";
import { PackingList } from "./components/PackingList.jsx";
import { Skeleton } from "./components/Skeleton.jsx";
import { TripForm } from "./components/TripForm.jsx";
import { parseOptions, groups } from "../shared/optionsSchema.js";
import { presetSelections } from "./costs.js";
import { journeyRequest, parseJourneys, parseFares } from "../shared/journeys.js";
import { JourneyPicker } from "./components/JourneyPicker.jsx";
import { OptionsPicker, CostPanel } from "./components/OptionsPicker.jsx";
import { useGenerate, useApiCall } from "./hooks/useGenerate.js";
import { useItinerary } from "./hooks/useItinerary.js";

const initialForm = {
  destination: null,
  origin: null,
  days: 3,
  budget: "",
  currency: "INR",
  interests: [],
  adults: 1,
  children: 0,
  rooms: "",
  startDate: "",
  departurePreference: "morning",
  returnPreference: "evening",
  pace: "balanced",
  foodPreference: "no preference",
  foodOther: "",
  anythingElse: "",
};

export default function App() {
  const mode = useServerMode();
  const [formValues, setFormValues] = useState(initialForm);
  const {
    status,
    plan: generatedPlan,
    error,
    generate,
    cancel,
    retryAfter: planRetryAfter,
  } = useGenerate();
  const { plan, dispatch, canUndo, packing, setPacking } =
    useItinerary(generatedPlan);

  const optionsCall = useApiCall("/api/options", parseOptions);
  const journeys = useApiCall("/api/journeys/structure", parseJourneys);
  const fares = useApiCall("/api/journeys/fares", parseFares);
  const [choice, setChoice] = useState({ id: null, tier: "standard", roundTrip: true, edits: {} });
  const [journeyNotice, setJourneyNotice] = useState("");
  const journeyInput = useRef(null);
  const [step, setStep] = useState(1);
  const [options, setOptions] = useState(null);
  const [selected, setSelected] = useState({});
  const [trip, setTrip] = useState(null);
  const [contingencyOn, setContingencyOn] = useState(false);
  const [planTrip, setPlanTrip] = useState(null);
  const pendingTrip = useRef(null);
  const stepHeading = useRef(null);
  const resultsPanel = useRef(null);
  const previousStep = useRef(1);
  useEffect(() => {
    if (step === previousStep.current && step !== 3) return;
    const heading = step === 3
      ? resultsPanel.current?.querySelector("h2")
      : stepHeading.current;
    (heading ?? resultsPanel.current)?.focus();
    previousStep.current = step;
  }, [step, status, plan?.days[0]?.id, planTrip]);
  useEffect(() => {
    if (optionsCall.status === "success" && optionsCall.plan) {
      const submission = pendingTrip.current;
      const input = journeyRequest(submission);
      if (JSON.stringify(input) !== JSON.stringify(journeyInput.current)) {
        setJourneyNotice(journeyInput.current
          ? "Your previous journey selection was reset because the trip details changed."
          : "");
        journeyInput.current = input;
        setChoice((current) => ({ ...current, id: null, edits: {} }));
        fares.reset();
        journeys.generate(input);
      }
      setTrip(submission);
      setOptions(optionsCall.plan);
      setSelected(presetSelections(optionsCall.plan));
      setStep(2);
    }
  }, [optionsCall.plan]);
  useEffect(() => {
    const routes = journeys.plan?.journeys;
    if (routes?.length) {
      setChoice((current) => ({ ...current, id: current.id ?? routes[0].id }));
      fares.generate(journeyInput.current);
    }
  }, [journeys.plan]);
  const route = journeys.status === "success"
    ? journeys.plan?.journeys.find((item) => item.id === choice.id)
    : null;
  const timing = route && journeyTiming(route, trip.departurePreference, trip.returnPreference, choice.roundTrip);
  const fareData = fares.status === "success" ? fares.plan?.fares : null;
  useEffect(() => {
    if (generatedPlan?.days.some((d) => d.stops.length))
      setPlanTrip(pendingTrip.current);
  }, [generatedPlan]);
  function handleSubmit(submission) {
    pendingTrip.current = submission;
    optionsCall.generate(submission);
  }
  const stale =
    trip &&
    [
      "destination",
      "origin",
      "days",
      "adults",
      "children",
      "currency",
      "startDate",
      "rooms",
      "departurePreference",
      "returnPreference",
      "pace",
      "foodPreference",
      "foodOther",
      "interests",
      "anythingElse",
      "budget",
    ].some(
      (k) =>
        JSON.stringify(formValues[k] ?? "") !== JSON.stringify(trip[k] ?? "") &&
        !(k === "rooms" && !formValues.rooms) &&
        !(k === "budget" && formValues.budget === "" && trip.budget == null),
    );
  function buildPlan() {
    setStep(3);
    generate({
      ...trip,
      journey: {
        id: route.id,
        hubs: routeHubs(route),
        roundTrip: choice.roundTrip,
        arrival: timing.arrival,
        leaveBy: timing.leaveBy,
      },
      selections: Object.fromEntries(
        groups.map((key) => [
          key,
          options[key].find((x) => x.id === selected[key]),
        ]),
      ),
    });
  }

  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Trip Planner home">
          <span className="brand-mark" aria-hidden="true">
            ✳
          </span>
          <span>Trip Planner</span>
        </a>
        {mode === "demo" && <span className="demo-badge" role="status">Demo data</span>}
        <a className="header-link" href="#planner">
          Find your buzz <span aria-hidden="true">↗</span>
        </a>
      </header>

      <BuzzIntro />
      <section
        id="planner"
        className="planner-layout options-flow"
        aria-label="Trip planner"
      >
        <nav className="flow-progress" aria-label="Planning progress">
          {["Trip details", "Choose options", "Your itinerary"].map(
            (label, i) => (
              <span
                key={label}
                aria-current={step === i + 1 ? "step" : undefined}
              >
                {i + 1}. {label}
              </span>
            ),
          )}
        </nav>
        {step === 1 && stale && (
          <p role="alert">Trip details changed. Regenerate options</p>
        )}
        {step === 1 && (
          <aside className="form-panel">
            <div className="section-eyebrow">YOUR NEXT ADVENTURE</div>
            <h2 ref={stepHeading} tabIndex={-1}>Plan a trip</h2>
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
        {optionsCall.status === "empty" && <EmptyState onRetry={() => optionsCall.generate(pendingTrip.current)} />}
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
            <JourneyPicker
              trip={trip}
              journeys={journeys.status === "loading" || journeys.status === "error" ? { ...journeys, plan: null } : journeys}
              fares={fares.status !== "success" ? { ...fares, plan: null } : fares}
              choice={choice}
              setChoice={setChoice}
              notice={journeyNotice}
              onChangeHubs={() => setStep(1)}
              retryRoutes={() => journeys.generate(journeyInput.current)}
              retryFares={() => fares.generate(journeyInput.current)}
              renderTiming={() => timing && (
                <p role="status">
                  Approximate arrival: Day {timing.arrivalDay}, {timing.arrival} ({clockTime(timing.arrivalMinute)}).
                  {timing.leaveBy && ` Leave by Day ${trip.days}, ${timing.leaveBy} (${clockTime(timing.leaveByMinute)}).`}
                  {(timing.arrivalDay > trip.days ||
                    (timing.leaveBy && timing.arrivalDay === trip.days && timing.arrivalMinute >= timing.leaveByMinute))
                    && " The selected timing leaves no activity time at the destination."}
                </p>
              )}
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
              disabled={stale || !route || status === "loading" || planRetryAfter > 0}
              onClick={buildPlan}
            >
              Build my itinerary
            </button>
          </>
        )}

        <section className="results-panel" ref={resultsPanel} tabIndex={-1} aria-label="Itinerary results" aria-live="polite">
          {step === 3 && status === "loading" && (
            <div className="loading-view">
              <h2 ref={stepHeading} tabIndex={-1}>Building your itinerary</h2>
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
      </section>
      <BuzzOutro />
    </main>
  );
}
