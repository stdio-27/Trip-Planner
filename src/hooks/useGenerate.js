import { useCallback, useEffect, useRef, useState } from "react";
import { parsePlan } from "../schema.js";

class InvalidPlanError extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidPlanError";
  }
}

export function useGenerate() {
  const [status, setStatus] = useState("idle");
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);
  const [droppedItems, setDroppedItems] = useState(0);
  const controllerRef = useRef(null);
  const latestId = useRef(0);

  const generate = useCallback(async (tripDetails) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = ++latestId.current;

    setStatus("loading");
    setPlan(null);
    setError(null);
    setDroppedItems(0);

    try {
      let parsedPlan;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        let response;
        try {
          response = await fetch("/api/plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(tripDetails),
            signal: controller.signal,
          });
        } catch (requestError) {
          if (controller.signal.aborted) {
            return;
          }
          throw requestError;
        }

        if (requestId !== latestId.current) {
          return;
        }

        if (!response.ok) {
          let message = `Trip plan request failed (${response.status}).`;
          try {
            const body = await response.json();
            if (typeof body.error === "string") {
              message = body.error;
            }
          } catch {
            // Keep the HTTP status message when the server response is not JSON.
          }
          throw new Error(message);
        }

        const responseText = await response.text();
        if (requestId !== latestId.current) {
          return;
        }
        if (!responseText.trim()) {
          setStatus("empty");
          return;
        }

        let body;
        try {
          body = JSON.parse(responseText);
        } catch {
          if (attempt === 0) {
            continue;
          }
          throw new InvalidPlanError("The server returned invalid itinerary JSON.");
        }

        const parsed = parsePlan(body);
        if (!parsed.success) {
          if (attempt === 0) {
            continue;
          }
          throw new InvalidPlanError("The AI returned an itinerary with an invalid shape.");
        }

        parsedPlan = parsed.data;
        break;
      }

      if (requestId !== latestId.current) {
        return;
      }

      if (!parsedPlan) {
        throw new InvalidPlanError("The AI did not return a valid itinerary.");
      }

      setPlan(parsedPlan);
      setDroppedItems(parsedPlan.droppedItems);
      setStatus(
        parsedPlan.days.length > 0 &&
          parsedPlan.days.some((day) => day.stops.length > 0)
          ? "success"
          : "empty",
      );
    } catch (requestError) {
      if (controller.signal.aborted || requestId !== latestId.current) {
        return;
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : "An unexpected error occurred while generating the trip.",
      );
      setStatus("error");
    } finally {
      if (requestId === latestId.current) {
        controllerRef.current = null;
      }
    }
  }, []);

  useEffect(
    () => () => {
      latestId.current += 1;
      controllerRef.current?.abort();
      controllerRef.current = null;
    },
    [],
  );

  return { status, plan, error, droppedItems, generate };
}
