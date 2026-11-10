import { Router } from "express";
import { z } from "zod";
import { originSchema, destinationSchema } from "../../shared/places.js";
import { CURRENCIES } from "../../shared/choices.js";
import { dateBounds } from "../../shared/schemas.js";
import { loadData } from "../data/index.js";
import { resolveTripPlaces } from "../tripPlaces.js";
import { buildJourneys } from "./engine.js";
import {
  demoFares,
  estimateFares,
  parseFareText,
  uniqueLegs,
} from "./fares.js";

const requestSchema = z.strictObject({
  origin: originSchema,
  destination: destinationSchema,
  date: z.iso
    .date()
    .refine((value) => {
      const bounds = dateBounds();
      return value >= bounds.min && value <= bounds.max;
    })
    .optional(),
  travelers: z.strictObject({
    adults: z.number().int().min(1).max(9),
    children: z.number().int().min(0).max(9),
  }),
  currency: z.enum(CURRENCIES),
});

export function createJourneyRouter({
  limiter,
  mockMode,
  apiKey,
  model,
  fetchImpl,
}) {
  const router = Router();
  router.post(["/journeys", "/journeys/structure", "/journeys/fares"], limiter, async (req, res) => {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({
          code: "INVALID_JOURNEY_REQUEST",
          error:
            "Check the selected places, travel date, travelers and currency.",
        });
      return;
    }
    const input = parsed.data;
    const verified = resolveTripPlaces(input);
    if (verified.errors) {
      res
        .status(400)
        .json({
          code: "INVALID_JOURNEY_PLACES",
          errors: verified.errors,
          error: Object.values(verified.errors)[0],
        });
      return;
    }
    const journeys =
      mockMode === "journeys-empty" ? [] : buildJourneys(input, loadData());
    const emptyReason = journeys.length
      ? null
      : !input.origin.airportId && !input.origin.stationCode
        ? "No origin transport hub was selected and no road route is in range."
        : "No connection matched the selected hubs and the bundled route data.";
    if (req.path === "/journeys/structure") {
      res.json({ journeys, emptyReason });
      return;
    }
    const legs = uniqueLegs(journeys);
    let fares = null;
    let faresError = null;
    if (legs.length) {
      try {
        if (mockMode === "demo") fares = demoFares(legs);
        else if (mockMode === "fares-bad-json")
          fares = parseFareText(
            "{",
            legs.map((item) => item.id),
          );
        else if (mockMode === "fares-fail") throw Error("Mock fare failure");
        else
          fares = await estimateFares({
            legs,
            currency: input.currency,
            date: input.date,
            apiKey,
            model,
            fetchImpl,
          });
      } catch {
        faresError =
          "Fare estimates are unavailable. You can retry the fare estimates.";
      }
    }
    res.json({
      ...(req.path === "/journeys" ? { journeys, emptyReason } : {}),
      currency: input.currency,
      fares,
      faresError,
    });
  });
  return router;
}
