import { useEffect, useState, useRef } from "react";
import { journeyTiming, routeHubs } from "../../shared/journeyTiming.js";
import { parseOptions, groups } from "../../shared/optionsSchema.js";
import { presetSelections } from "../costs.js";
import {
  journeyRequest,
  parseJourneys,
  parseFares,
} from "../../shared/journeys.js";
import { useGenerate, useApiCall } from "./useGenerate.js";
import { useItinerary } from "./useItinerary.js";
import { useServerMode } from "./useServerMode.js";
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

export function useTripPlanner(step, setStep) {
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
  const [choice, setChoice] = useState({
    id: null,
    tier: "standard",
    roundTrip: true,
    edits: {},
  });
  const [journeyNotice, setJourneyNotice] = useState("");
  const journeyInput = useRef(null);
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
    const heading =
      step === 3
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
        setJourneyNotice(
          journeyInput.current
            ? "Your previous journey selection was reset because the trip details changed."
            : "",
        );
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
  const route =
    journeys.status === "success"
      ? journeys.plan?.journeys.find((item) => item.id === choice.id)
      : null;
  const timing =
    route &&
    journeyTiming(
      route,
      trip.departurePreference,
      trip.returnPreference,
      choice.roundTrip,
    );
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

  return {
    buildPlan,
    canUndo,
    cancel,
    choice,
    contingencyOn,
    dispatch,
    error,
    fareData,
    fares,
    formValues,
    handleSubmit,
    journeyInput,
    journeyNotice,
    journeys,
    mode,
    options,
    optionsCall,
    packing,
    pendingTrip,
    plan,
    planRetryAfter,
    planTrip,
    resultsPanel,
    route,
    selected,
    setChoice,
    setContingencyOn,
    setFormValues,
    setOptions,
    setPacking,
    setSelected,
    setStep,
    stale,
    status,
    step,
    stepHeading,
    timing,
    trip,
  };
}
