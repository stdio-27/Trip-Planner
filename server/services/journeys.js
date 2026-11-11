import { resolveTripPlaces } from "../tripPlaces.js";
import { uniqueLegs } from "../journeys/fares.js";
import { flagFares } from "../journeys/fareChecks.js";
export function createJourneyService({ getData, buildRoutes, fareProvider }) {
  return async function getJourneys(input, kind) {
    const verified = resolveTripPlaces(input, getData());
    if (verified.errors) {
      return {
        status: 400,
        body: {
          code: "INVALID_JOURNEY_PLACES",
          errors: verified.errors,
          error: Object.values(verified.errors)[0],
        },
      };
    }
    const journeys = buildRoutes(input);
    const emptyReason = journeys.length
      ? null
      : !input.origin.airportId && !input.origin.stationCode
        ? "No origin transport hub was selected and no road route is in range."
        : "No connection matched the selected hubs and the bundled route data.";
    if (kind === "/journeys/structure") {
      return {
        status: 200,
        body: {
          journeys,
          emptyReason,
        },
      };
    }
    const legs = uniqueLegs(journeys);
    let fares = null;
    let faresError = null;
    if (legs.length) {
      try {
        fares = await fareProvider.estimate({
          legs,
          currency: input.currency,
          date: input.date,
        });
        fares = flagFares(fares, legs, input.currency);
      } catch {
        faresError =
          "Fare estimates are unavailable. You can retry the fare estimates.";
      }
    }
    return {
      status: 200,
      body: {
        ...(kind === "/journeys"
          ? {
              journeys,
              emptyReason,
            }
          : {}),
        currency: input.currency,
        fares,
        faresError,
      },
    };
  };
}
