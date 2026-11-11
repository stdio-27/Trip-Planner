# Verification record — v2 Phase 8

## Completed checks
- **Full Test Suite:** 233 tests across 20 test files passing with 0 failures (`npm test`).
- **Static Type Checking:** Core schemas, cost module, and server modules pass type checks without errors (`npm run typecheck` via `tsc -p jsconfig.json`).
- **Production Asset Build:** `npm run build` succeeds; the place picker component is split into its own lazy-loaded bundle chunk (`dist/assets/TripPlaceFields-*.js`, 7.59 kB raw / 2.82 kB gzip).
- **Security & Dependency Audit:** `npm audit` reports 0 vulnerabilities. Grep and binary scans on `dist/` confirm zero references to `GEMINI_API_KEY` or Google AI key patterns (`AIza*`).
- **Server Startup & Memory:** Verified via `artifacts/phase8-benchmark.mjs` — server starts and loads indexed data in ~2.09s, process working set memory is 162.2 MiB, and static assets serve with `Content-Encoding: gzip`.
- **Live Gemini Model Verification:** 6 diverse real-world Indian itinerary scenarios executed against live Gemini `gemini-flash-lite-latest` with 100% success (documented in `docs/LIVE_RUNS.md`).
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
- Unofficial booking links (IRCTC and Google Flights) open external official sites in new tabs; their live pricing is not fetched programmatically.
- Client state is maintained in-memory for the current browser session. A hard page refresh clears state back to Step 1.
- Two benign Rollup/Zod comment-placement warnings appear during Vite production builds; they do not impact output or runtime behavior.
