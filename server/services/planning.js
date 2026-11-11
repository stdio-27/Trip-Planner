import { resolveTripPlaces } from "../tripPlaces.js";
import { buildJourneys } from "../journeys/engine.js";
import { journeyTiming, routeHubs } from "../../shared/journeyTiming.js";
export function createPlanningService({ getData, planner }) {
  return async function plan(input, isOptions) {
    const resolved = resolveTripPlaces(
      input,
      "origin" in input ? getData() : undefined,
    );
    if (resolved.errors) {
      return {
        status: 400,
        body: {
          errors: resolved.errors,
          error: Object.values(resolved.errors)[0],
        },
      };
    }
    const { journey: requestedJourney, ...tripDetails } = resolved.data;
    if (requestedJourney) {
      const selected =
        !isOptions &&
        "origin" in input &&
        buildJourneys(
          {
            origin: input.origin,
            destination: input.destination,
          },
          getData(),
        ).find((item) => item.id === requestedJourney.id);
      if (
        !selected ||
        JSON.stringify(routeHubs(selected)) !==
          JSON.stringify(requestedJourney.hubs)
      ) {
        return {
          status: 400,
          body: {
            error:
              "The selected journey or hubs changed. Choose a journey again.",
          },
        };
      }
      const timing = journeyTiming(
        selected,
        tripDetails.departurePreference,
        tripDetails.returnPreference,
        requestedJourney.roundTrip,
      );
      const arrivalHub = selected.legs
        .map((leg) => leg.to)
        .filter((point) => point.kind !== "place")
        .at(-1);
      tripDetails["journey"] = {
        id: selected.id,
        hubs: routeHubs(selected),
        roundTrip: requestedJourney.roundTrip,
        durationMinutes: selected.totalDurationMin,
        arrivalHub: arrivalHub?.name ?? null,
        legs: selected.legs.map(({ mode, from, to }) => ({
          mode,
          from: from.name,
          to: to.name,
        })),
        ...timing,
      };
    }
    return planner.generate(tripDetails, isOptions);
  };
}
