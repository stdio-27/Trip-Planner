# Verification record — v2 Phase 8

Historical Phase 8 record. For the later master-pack polish and final structure, use [BASELINE.md](docs/BASELINE.md), [QA_REPORT.md](docs/QA_REPORT.md) and [REFACTOR_LOG.md](docs/REFACTOR_LOG.md). The counts below describe that earlier checkpoint.

## Completed checks
- **Full Test Suite:** 233 tests across 20 test files passing with 0 failures (`npm test`).
- **Static Type Checking:** Core schemas, cost module, and server modules pass type checks without errors (`npm run typecheck` via `tsc -p jsconfig.json`).
- **Production Asset Build:** `npm run build` succeeds; the place picker component is split into its own lazy-loaded bundle chunk (`dist/assets/TripPlaceFields-*.js`, 7.59 kB raw / 2.82 kB gzip).
- **Security & Dependency Audit:** `npm audit` reports 0 vulnerabilities. Grep and binary scans on `dist/` confirm zero references to `GEMINI_API_KEY` or Google AI key patterns (`AIza*`).
- **Server Startup & Memory:** Verified via `artifacts/phase8-benchmark.mjs` — latest isolated server startup and index loading took 1.187s, process working set memory was 162.4 MiB, and static assets serve with `Content-Encoding: gzip`.
- **Live Gemini Model Verification:** 6 diverse real-world Indian itinerary scenarios executed against live Gemini `gemini-flash-lite-latest` with the requested day counts in all six responses (documented in `docs/LIVE_RUNS.md`).
- **Browser Accessibility & Responsiveness:** Verified at 360px, 390px, and 768px widths with zero unintended horizontal overflow. Keyboard focus follows step navigation, and ARIA combobox / listbox states are correctly managed.

## Failure-mode coverage matrix
| Mode | Expected behavior and UI recovery | Evidence |
| --- | --- | --- |
| `demo` | Illustrative fares, options, and itineraries matching requested days and currency. | HTTP, reducer, and browser integration tests |
| `geo-down` | Place search shows temporary outage banner with Retry and fallback to bundled hub search. | Provider mock tests and `TripPlaceFields.test.jsx` |
| `geo-slow` | Search displays loading state, then surfaces the geocoder outage fallback after a 5s deadline. | Provider timeout tests and Express router tests |
| `geo-empty` | Shows no matches found and invites the traveler to refine search or pick a bundled hub. | Places router unit tests |
| `fares-bad-json` | Journey routes render immediately; fare section displays fallback notice allowing manual price edits or retry. | Journey router tests and `App.test.jsx` |
| `fares-fail` | Fares error banner displayed while preserving computed routes, selected journey, and tier. | Journey routes unit tests and UI retry tests |
| `journeys-empty` | Informs the user no route matched the selected hubs and provides a "Change hubs" action that restores setup. | Journey engine tests and `App.test.jsx` |
| `options-bad-shape` | Invalid-response message displayed after automatic retry, preserving trip details. | Shared schema tests and options lifecycle tests |
| `options-empty` | Empty state with "Try again" action without losing entered trip details. | Component and options lifecycle tests |
| `bad-json`, `bad-shape` | Itinerary error banner with Retry button; initial form input preserved. | Parser, extractJson, and request lifecycle tests |
| `empty` | "No itinerary to show yet" empty panel with "Try again" button. | Component and request lifecycle tests |
| `fail` | Server error message displayed in ErrorState with Retry button. | Endpoint and request lifecycle tests |
| `slow` | Skeleton loading view with accessible Cancel button; aborts cleanly with friendly message at 30s. | Fake-timer hook tests in `requestLifecycle.test.js` |
| `jitter` | Monotonic request ID tracking (`latestId`) guarantees older delayed responses never overwrite newer requests. | Hook concurrency tests in `requestLifecycle.test.js` |
| `wrong-days` | Server and client enforce exact day count (1–14 days); incorrect day counts trigger corrective retry. | Regression tests for 1, 2, 3, 5, 7, 14 days in `App.test.jsx` |

## Honest limits
- Live seat inventory, booking status, and real-time rail/air fares are not available through free public APIs. All timetables reflect documented snapshot years (2016 for datameet rail, 2014 for OpenFlights) and fares are explicitly marked as AI estimates.
- Train and flight links open IRCTC or Google Flights in a new tab. The app does not fetch live booking inventory from those pages.
- Client state is maintained in-memory for the current browser session. A hard page refresh clears state back to Step 1.
- Two benign Rollup/Zod comment-placement warnings appear during Vite production builds; they do not impact output or runtime behavior.


## Final Phase 8 status check

Rechecked on 11 November 2026 IST from commit `91ffcdf`.

- The full suite passed all 233 tests across 20 files. Type checking and the production build passed.
- The npm audit reported zero vulnerabilities. The production scan found zero configured-key matches or Google API key signatures.
- A fresh local clone installed with `npm install`. Running `npm start` on isolated ports served the Vite frontend and returned a successful `/api/health` response through its proxy. The test process tree was stopped after verification.
- Production serving returned HTTP 200 with `Content-Encoding: gzip`. The place picker remained a separate lazy-loaded chunk. The latest measured startup was below the two-second target.
- All three planning steps were checked at viewport widths of 360, 390 and 768 pixels. Document width stayed within the available width at every step.
- The browser showed Cancel during a simulated four-second API delay. Cancelling preserved the previous itinerary. A delayed generation also completed successfully.
- During a simulated API connection failure, the browser displayed an error with Try again and retained the previous itinerary. Restoring the connection and retrying cleared the error and generated a usable result.
- Back restored the selected destination and origin district. Keyboard arrow navigation changed the active itinerary day.

The delayed and disconnected checks used an isolated local test server with deterministic place results and demo generation. They test the loaded page's API recovery behavior. A full offline reload still requires the app server, as documented in the README.

The earlier keyboard traversal covered setup, journey expansion and itinerary navigation. A physical-phone check remains pending because no connected phone is available in this workspace. Responsive desktop viewports provide the recorded mobile-width evidence.
