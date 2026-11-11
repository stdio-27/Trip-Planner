import { Router } from "express";
import { createJourneyRequestSchema } from "../../shared/journeys.js";
import { composeJourneys } from "../composition.js";
import { sendResult } from "../responses.js";
export { demoFareModes } from "../config.js";
export function createJourneyRouter(options) {
  const { limiter, jsonBody, noQuery } = options;
  const getJourneys = options.getJourneys ?? composeJourneys(options);
  const requestSchema = createJourneyRequestSchema();
  const router = Router();
  router.post(
    ["/journeys", "/journeys/structure", "/journeys/fares"],
    limiter,
    noQuery,
    jsonBody,
    async (req, res) => {
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
      sendResult(res, await getJourneys(parsed.data, req.path));
    },
  );
  return router;
}
