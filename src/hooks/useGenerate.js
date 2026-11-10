import { useCallback, useEffect, useRef, useState } from "react";
import { parsePlan } from "../schema.js";

class InvalidPlanError extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidPlanError";
  }
}

export function useApiCall(endpoint, parser) {
  const [status, setStatus] = useState("idle");
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState(null);
  const [droppedItems, setDroppedItems] = useState(0);
  const controllerRef = useRef(null);
  const timeoutRef = useRef(null);
  const latestId = useRef(0);
  const planRef = useRef(null);

  const cancel = useCallback(() => {
    latestId.current += 1;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    controllerRef.current?.abort();
    controllerRef.current = null;
    setStatus(planRef.current ? "success" : "idle");
    setError(null);
    setFieldErrors(null);
  }, []);

  const generate = useCallback(
    async (tripDetails) => {
      controllerRef.current?.abort();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const controller = new AbortController();
      controllerRef.current = controller;
      const requestId = ++latestId.current;

      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, 30_000);
      timeoutRef.current = timer;

      setStatus("loading");
      setError(null);
      setFieldErrors(null);
      setDroppedItems(0);

      try {
        let parsedPlan;

        for (let attempt = 0; attempt < 2; attempt += 1) {
          let response;
          try {
            response = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(tripDetails),
              signal: controller.signal,
            });
          } catch (requestError) {
            throw requestError;
          }

          if (requestId !== latestId.current) {
            return;
          }

          if (!response.ok) {
            let message = `Trip plan request failed (${response.status}).`;
            try {
              const body = await response.json();
              if (
                requestId === latestId.current &&
                body.errors &&
                typeof body.errors === "object"
              ) {
                message = Object.values(body.errors).join(" ");
                setFieldErrors(body.errors);
              }
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
            planRef.current = null;
            setPlan(null);
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
            throw new InvalidPlanError(
              "The server returned invalid itinerary JSON.",
            );
          }

          const parsed = parser(body);
          if (
            !parsed.success ||
            (endpoint === "/api/plan" &&
              tripDetails.days != null &&
              parsed.data?.days.length > 0 &&
              parsed.data.days.length !== tripDetails.days)
          ) {
            if (attempt === 0) {
              continue;
            }
            throw new InvalidPlanError(
              "The AI returned an itinerary with an invalid shape.",
            );
          }

          parsedPlan = parsed.data;
          break;
        }

        if (requestId !== latestId.current) {
          return;
        }

        if (!parsedPlan) {
          throw new InvalidPlanError(
            "The AI did not return a valid itinerary.",
          );
        }

        planRef.current = parsedPlan;
        setPlan(parsedPlan);
        setDroppedItems(parsedPlan.droppedItems || 0);
        setStatus(
          !parsedPlan.days ||
            (parsedPlan.days.length > 0 &&
              parsedPlan.days.some((day) => day.stops.length > 0))
            ? "success"
            : "empty",
        );
      } catch (requestError) {
        if (requestId !== latestId.current) {
          return;
        }

        if (controller.signal.aborted) {
          if (timedOut) {
            setError("This is taking too long. Please try again.");
            setStatus("error");
          }
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "An unexpected error occurred while generating the trip.",
        );
        setStatus("error");
      } finally {
        clearTimeout(timer);
        if (timeoutRef.current === timer) {
          timeoutRef.current = null;
        }
        if (requestId === latestId.current) {
          controllerRef.current = null;
        }
      }
    },
    [endpoint, parser],
  );

  useEffect(
    () => () => {
      latestId.current += 1;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      controllerRef.current?.abort();
      controllerRef.current = null;
    },
    [],
  );

  return { status, plan, error, fieldErrors, droppedItems, generate, cancel };
}

export function useGenerate() {
  return useApiCall("/api/plan", parsePlan);
}
