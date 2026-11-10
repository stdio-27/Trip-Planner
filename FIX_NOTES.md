# Audit & Engineering Fix Notes

## Task 1: Cancel and Client Timeout
- Added an explicit `cancel()` function to `useGenerate` and wired a visible Cancel button above the loading skeleton in `App.jsx`, ensuring users can immediately abort in-flight requests and reuse the form.
- Implemented a 30-second client-side timeout using a local `timedOut` boolean flag inside `setTimeout`, so timeouts clearly show "This is taking too long. Please try again." with a Retry button without incorrectly conflating user cancellations or newer requests as errors.
- Enforced monotonic request ID tracking (`latestId`) and cleared timers in `finally`, guaranteeing that aborted, cancelled, or superseded requests never update React state or leak memory.
- Installed `@testing-library/react` and `jsdom`, configured Vitest's environment to `jsdom`, and rewrote `src/requestLifecycle.test.js` to test the real `useGenerate` hook with fake timers covering timeouts, cancellations, stale responses, and unmount cleanups.

## Task 2: Fresh Clone Scripts and Static Asset Serving
- Reconfigured `package.json` so `npm start` executes both Vite and Express concurrently, allowing a fresh clone to immediately load the frontend at port 5173 with requests proxied to port 8787.
- Added a `start:prod` script that builds the client and boots the Express server, and configured Express to serve `dist/` statically with an Express 5 compatible SPA fallback while returning 404 JSON for unknown `/api` routes.
- Updated `.env.example` with complete configuration options including `GEMINI_API_KEY`, `GEMINI_MODEL`, `PORT`, and commented documentation for all supported `MOCK` modes.
- Verified that running `npm start` starts both servers and successfully responds to both frontend and backend health checks.

## Task 3: Input Validation and Prompt-Injection Hardening
- Implemented client-side input constraints in `TripForm.jsx` including `maxLength` attributes, dynamic character counters, automatic trimming before submission, and inline validation warnings when required fields are empty.
- Extracted and unit-tested a server-side input validator (`server/validator.js`) that verifies types, enforces bounds (1-1000 chars for destination, max 500 for interests, 1-30 integer days, 3-letter currency code), lowers Express JSON body limit to 10kb, and returns 400 JSON errors on violations.
- Hardened `server/prompt.js` against prompt-injection attacks by enclosing user input in `<user_trip_details>` XML-like delimiters and directing Gemini to treat user text strictly as raw data and return an empty plan shape for non-trip or malicious queries.

## Task 4: Robust JSON Extraction and Gemini Structured Outputs
- Created a dedicated balanced-brace scanner (`server/extractJson.js`) that tracks string quotation boundaries and escape sequences, ignoring non-JSON braces like `{A}` in surrounding commentary and extracting the first valid JSON object candidate.
- Configured Gemini's native `responseSchema` on model calls to enforce structured JSON adherence directly at generation time, while preserving client-side Zod parsing as a strict safety net.
- Wrote unit tests in `server/extractJson.test.js` validating markdown fences, commentary before and after, multiple JSON blocks, braces inside strings, and truncated text.

## Task 5: Endpoint Rate Limiting and Architecture Notes
- Installed and applied `express-rate-limit` on `POST /api/plan` limiting each IP to 10 requests per minute with standard headers and returning a user-friendly 429 JSON response ("Too many trip planning requests. Please wait a minute before trying again.").
- Verified that 429 errors are caught by `useGenerate` and properly presented to the user via the existing error banner with a retry action.
- Deliberately refrained from adding `cors` or `helmet`: because the Vite dev server proxies `/api` to Express and the production server serves `dist/` directly, the app operates as a same-origin system. If the frontend and backend were decoupled onto separate origins (e.g. Vercel and Cloud Run), `cors` would be essential to allow browser API access and `helmet` would provide security header hardening.
