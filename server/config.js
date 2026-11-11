import { demoFareModes } from "./journeys/routes.js";
export function serverMode(mockMode) {
  return demoFareModes.has(mockMode) || ["fares-bad-json", "fares-fail", "journeys-empty"].includes(mockMode)
    ? "demo" : "live";
}
export function startupWarning({ apiKey, mockMode }) {
  return !apiKey && serverMode(mockMode) === "live"
    ? "GEMINI_API_KEY is empty. Set a server key for live generation or use MOCK=demo."
    : null;
}
