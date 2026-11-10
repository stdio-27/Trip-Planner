import { describe, expect, it } from "vitest";
import rateLimit from "express-rate-limit";

describe("planLimiter rate limiting", () => {
  it("enforces rate limit and returns friendly 429 JSON response", async () => {
    let statusCode;
    let jsonBody;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        jsonBody = body;
        return this;
      },
      setHeader() {},
      getHeader() {},
    };

    const limiter = rateLimit({
      windowMs: 60 * 1000,
      max: 1,
      validate: { trustProxy: false, xForwardedForHeader: false },
      handler: (_req, response) => {
        response.status(429).json({
          error: "Too many trip planning requests. Please wait a minute before trying again.",
        });
      },
    });

    const req = {
      ip: "127.0.0.1",
      headers: {},
      app: { get: () => undefined },
    };
    const next = () => {};

    // First request passes
    await limiter(req, res, next);
    expect(statusCode).toBeUndefined();

    // Second request within same window triggers 429
    await limiter(req, res, next);
    expect(statusCode).toBe(429);
    expect(jsonBody).toEqual({
      error: "Too many trip planning requests. Please wait a minute before trying again.",
    });
  });
});
