import express from "express";
import rateLimit from "express-rate-limit";
export function createMiddleware() {
  const limitRequests = (max) =>
    rateLimit({
      windowMs: 60 * 1000,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          code: "RATE_LIMITED",
          error:
            "Too many trip planning requests. Please wait a minute before trying again.",
        });
      },
    });

  const planLimiter = limitRequests(10);
  const lookupLimiter = limitRequests(30);
  const otherApiLimiter = limitRequests(60);
  const jsonBody = express.json({ limit: "10kb" });
  /** @type {import("express").RequestHandler} */
  const noQuery = (req, res, next) => {
    if (Object.keys(req.query).length) {
      res
        .status(400)
        .json({ code: "INVALID_QUERY", error: "Invalid query parameters." });
      return;
    }
    next();
  };

  return { planLimiter, lookupLimiter, otherApiLimiter, jsonBody, noQuery };
}
/** @type {import("express").ErrorRequestHandler} */
export const reportRequestError = (error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.status === 413) {
    res.status(413).json({ error: "Request body exceeds 10 KB." });
  } else if (error.status >= 400 && error.status < 500) {
    res.status(error.status).json({ error: "Invalid request body." });
  } else {
    res
      .status(500)
      .json({ error: "The server could not complete the request." });
  }
};
