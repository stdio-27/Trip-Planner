import { Router } from "express";
import { validateTripInput } from "../validator.js";
import { sendResult } from "../responses.js";
export function createPlanningRouter({ plan, planLimiter, noQuery, jsonBody }) {
  const router = Router();
  router.post(
    ["/plan", "/options"],
    planLimiter,
    noQuery,
    jsonBody,
    async (req, res) => {
      const validation = validateTripInput(req.body);
      if (!validation.valid) {
        res
          .status(400)
          .json({ errors: validation.errors, error: validation.error });
        return;
      }
      sendResult(res, await plan(validation.data, req.path === "/options"));
    },
  );
  return router;
}
