// @vitest-environment node
import { expect, it } from "vitest";
import { serverMode, startupWarning } from "./config.js";
it("labels live and all documented fault modes without exposing configuration", () => {
  expect(serverMode(undefined)).toBe("live");
  for (const mode of ["demo","slow","fares-fail","journeys-empty","geo-down"]) expect(serverMode(mode)).toBe("demo");
  expect(serverMode("unknown")).toBe("live");
});
it("warns about a missing live key and stays quiet for configured or demo runs", () => {
  expect(startupWarning({apiKey:"",mockMode:undefined})).toContain("MOCK=demo");
  expect(startupWarning({apiKey:"",mockMode:"demo"})).toBeNull();
  expect(startupWarning({apiKey:"test-only",mockMode:undefined})).toBeNull();
});
