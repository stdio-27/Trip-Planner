# Audit & Engineering Fix Notes

## Task 1: Cancel and Client Timeout
- Added an explicit `cancel()` function to `useGenerate` and wired a visible Cancel button above the loading skeleton in `App.jsx`, ensuring users can immediately abort in-flight requests and reuse the form.
- Implemented a 30-second client-side timeout using a local `timedOut` boolean flag inside `setTimeout`, so timeouts clearly show "This is taking too long. Please try again." with a Retry button without incorrectly conflating user cancellations or newer requests as errors.
- Enforced monotonic request ID tracking (`latestId`) and cleared timers in `finally`, guaranteeing that aborted, cancelled, or superseded requests never update React state or leak memory.
- Installed `@testing-library/react` and `jsdom`, configured Vitest's environment to `jsdom`, and rewrote `src/requestLifecycle.test.js` to test the real `useGenerate` hook with fake timers covering timeouts, cancellations, stale responses, and unmount cleanups.
