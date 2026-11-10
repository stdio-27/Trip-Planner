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
