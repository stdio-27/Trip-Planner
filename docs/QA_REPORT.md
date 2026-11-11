# Independent QA audit

Audited from `v2-feature-complete` plus Stage 1 hygiene, on 11 November 2026 IST. This stage adds regression evidence and reports findings without modifying product code. Route placeholders were replaced with five representative routes selected by Codex. The user's personal familiarity and route judgments remain UNVERIFIED.

## Assignment requirements

| Requirement | Status | Evidence |
| --- | --- | --- |
| Function components and hooks | PASS | src/App.jsx, src/hooks/useGenerate.js, useItinerary.js |
| Free-form trip input | PASS | TripForm.jsx anythingElse textarea, shared/schemas.js 300-character bound |
| Real LLM through backend | PASS | server/app.js provider call, prior six HTTP 200 live runs in LIVE_RUNS.md |
| Structured JSON validation | PASS | shared/planSchema.js, server/planSchema.js, schema.test.js |
| Malformed/wrong-shape/empty/slow/failed/stale handling | PASS | requestLifecycle.test.js, optionsLifecycle.test.js, mockModes.test.js |
| Loading, error, empty states | PASS | App.test.jsx options-state and cancellation tests |
| Mobile | PARTIAL | Stage 1 browser widths and VERIFICATION.md; physical phone UNVERIFIED |
| README setup, AI note, limits, time | PARTIAL | README.md includes setup and limits, actual time and user authorship remain placeholders |
| Fresh install and start | PASS | BASELINE.md fresh clone, health 200 and complete demo flow |

## Findings at audit time

| ID | Severity | Repro and actual behavior | Expected and suggested fix | Evidence / status |
| --- | --- | --- | --- | --- |
| H1 | High | Feed a finite fare of 1e308 to normalizeFares. It passes and multiplying by a traveling group can overflow totals. | Apply the existing UI's 1e9 fare limit to server/model fare validation. | server/qaAudit.test.js “QA-H1 rejects finite fares that can overflow group totals”, initially it.fails; shared/journeys.js fareSchema. FIXED in Stage 3a |
| M1 | Medium | Revisit a place query. useDebouncedSearch requests it again. A 429 exposes no countdown. | Ten-minute normalized session cache and Retry-After countdown. | src/hooks/useDebouncedSearch.js; useGenerate.js HTTP-error branch. FIXED, Stage 3b |
| M2 | Medium | Upstream Gemini 429 maps to HTTP 429 without explicitly setting Retry-After. | Supply a safe retry delay header for every 429 path. | server/app.js provider error mapping. FIXED, Stage 3b |
| M3 | Medium | Demo and live health return the same status-only object, with no visible demo badge. | Expose safe mode metadata and show Demo data. | server/app.js /api/health; src/App.jsx header. FIXED, Stage 3d |
| M4 | Medium | Run the JSX type scan described in TYPECHECK.md. UI remains outside the blocking type check. | Resolve bounded typing issues or record exact remaining diagnostics. | jsconfig.json include list; docs/TYPECHECK.md. FIXED, Stage 3e |
| L1 | Low | Multiple flight variants share identical radio accessible names. | Include the actual hub route in the label. | JourneyPicker.jsx aria-label. FIXED, Stage 3e |
| L2 | Low | Footer lacks dataset attribution. | Add the requested source credits and a working source-document link. | BuzzLanding.jsx footer. FIXED, Stage 3e |

No Critical finding was established in this audit. Failure to establish one is not a proof of their absence.

## Edge-case matrix

| Case | Evidence and result |
| --- | --- |
| Numeric types, boundaries, unicode, budget 0, date bounds | qaAudit.test.js, shared/schemas.test.js, TripForm.test.jsx; covered with deterministic clocks and table inputs |
| Every possible paste/string and real IST midnight transition | UNVERIFIED beyond the explicit schema, numeric-paste and date fixtures |
| Typing without selection, state reset, Back | App.test.jsx and TripPlaceFields.test.jsx |
| Rapid typing, stale results, provider down/slow/empty | TripPlaceFields.test.jsx; server/geo/routes.test.js provider/fault tests |
| Search 429 countdown and normalized repeated queries | Added and tested in Stage 3b, M1 |
| LGD naming mismatch and same name in different states | State-scoped district matcher in TripPlaceFields.jsx; complete geographic ambiguity set UNVERIFIED |
| Same-city, direct, multi-leg, missing junction, sparse north-east | journeys/engine.test.js and QA_ROUTES.json |
| Andaman remote hub | QA_ROUTES.json Port Blair route using the committed IXZ record |
| Lakshadweep and Ladakh UI journeys | UNVERIFIED |
| Invalid hub IDs and tampered client fare fields | app.test.js invalid places and tampered journey tests |
| Missing/negative/NaN/non-monotonic fare tiers | journeys/engine.test.js normalizeFares tests |
| Extreme finite fares | Reproduced H1 with an expected-failure regression |
| Children, room overrides, vehicles, edited fares, tier and return toggle | costs.test.js and App.test.jsx |
| Zero-decimal currency and formatting | costs.test.js JPY fixture |
| Full panel/itinerary rounding equivalence | UNVERIFIED |
| Exact day count 1–14 | qaAudit.test.js tests every count |
| Arrival/leave-by constraints | app.test.js timing-prompt tests; LIVE_RUNS.md parseable-time observations |
| Remove all stops, cross-day move, undo cap, new-plan reset | itineraryReducer.test.js; browser remove/undo evidence in BASELINE.md |
| Cancel, timeout, superseding request, unmount, bounded retry | requestLifecycle.test.js and optionsLifecycle.test.js |
| Injection strings, unknown query, oversized body, rate limits, sanitized errors | app.test.js, validator.test.js, geo/routes.test.js, qaAudit.test.js |
| Build secret patterns | BASELINE.md and stage1 scan evidence |
| Keyboard, focus, ARIA, reduced motion | Stage 1 browser evidence; Combobox.jsx; styles.css reduced-motion rules |
| Automated axe and measured colour contrast | Automated axe added in Stage 3e; JSDOM colour contrast is disabled and visual contrast review remains separately scoped. |

## Sanity routes and complete outputs

`docs/QA_ROUTES.json` contains every returned journey, leg, duration, evidence label and deterministic basic/standard/premium demo fare for all five routes. Reproduce with `node artifacts/master-pack/routes.mjs`. Coordinates deliberately use the selected airport snapshot locations to make the fixture reproducible. They do not represent city-center geocoding.

No demo amount is asserted to be a current fare. Personal route plausibility review, real inventory and schedules remain UNVERIFIED.

## Stage 3 accessibility verification limits

The three-step axe test passed with zero reported violations. JSDOM colour-contrast analysis is disabled and canvas warnings remain in its output. A separate sRGB calculation measured the main CSS pairs, recorded in artifacts/master-pack/contrast.json. Full computed contrast over every blended surface, a physical phone and assistive-technology behavior remain UNVERIFIED. CLI startup and data-build console output is retained because it reports command readiness and measured data counts. No production TODO was found by the source search.

Optional Stage 3f persistence is deliberately skipped. The existing in-memory session behavior is retained, and the requested polish does not justify another storage lifecycle.


## Re-verification observations

The first post-polish clean-install test run failed in “lets the traveler select dataset hubs when the geocoder is down” because the default one-second query wait expired while the state picker still showed Loading states. The next two runs passed. Evidence is artifacts/master-pack/reverify-test-1.log through reverify-test-3.log. The test now explicitly allows eight seconds for its asynchronous initial state list. This changes the test harness, not picker behavior.

The new HTTP golden test also needed to wait for the arrival-hub default before submitting. Its standalone and coverage runs passed after that harness correction. The full plan was subsequently approved; Stage 6 results are recorded in REFACTOR_LOG.md.


A browser recheck reproduced a new Medium focus finding: loading focused its temporary heading, but removing that heading after a usable plan left focus on BODY. The “keeps focus on the itinerary heading after the loading view disappears” regression failed before the fix (artifacts/master-pack/focus-regression-before.log). The result effect now focuses the current result heading after status/plan transitions, and result/error/empty headings accept programmatic focus. This small Stage 3e correction leaves cost edits from moving focus.

## Stage 7 current-code audit — 12 November 2026

The complete suite passed three times on f4285c4: 271 tests / 28 files each, including the unchanged golden path, HTTP contracts, five cost snapshots, QA-H1, all day counts 1–14, request races, cancellation, rates, data contracts and three-step axe checks. The new composition contract exercises the same planning/place/fare assertions in demo and HTTP-mocked live modes. `compare-routes.mjs` again found all five Stage 2 journey arrays byte-identical. Typecheck includes production UI and passed; madge reported zero cycles. Evidence: stage7-checks.json, routes-after.json, cycles-6d.json and server/composition.test.js. No new assertion failure was observed.

The final built app was verified in the browser for all 16 documented modes: demo, geo-down, geo-slow, geo-empty, fares-bad-json, fares-fail, journeys-empty, bad-json, bad-shape, empty, fail, slow, jitter, wrong-days, options-bad-shape and options-empty. Fare faults displayed retry; empty journeys displayed Change hubs; invalid plans displayed Try again; options/plan emptiness displayed the empty state; slow Cancel dismissed loading without an error; jitter completed. Geocoder faults exposed retry/manual hub fallback. Trip notes were retained across the fault checks. Evidence: artifacts/master-pack/browser-post-refactor.json (16 modes), plus the server mock tests. These fault checks use a deterministic geocoder except when injecting its faults; the fresh-clone flow separately exercised real Open-Meteo.

Fresh-clone browser verification covered tier/stay/food cost changes, heading focus, remove/undo, keyboard cross-day drag, reorder and packing. Setup and results had content widths equal to client widths at 360/390/768 viewports (345/375/753 CSS pixels after scrollbar). The sketch layout remained visually consistent in desktop and phone screenshots. Evidence: fresh-flow.json, final-demo.jpg and final-phone.jpg. This establishes observed behavior, not pixel-perfect visual equivalence or a physical-device test.

All six live scenarios eventually passed; provider 503 attempts are retained in LIVE_RUNS.md. Prices remain estimates, not verified fares. No Critical/High regression was established. Known limits remain: physical phones/assistive technology, blended-surface contrast, geographic ambiguity beyond fixtures, route/fare human judgment, and remote fresh-clone acceptance. Empty/unselected place fields can still show technical Zod wording; this pre-existing wording was retained during the behavior-preserving refactor. Bundle growth and timing variance are reported in BASELINE.md rather than labelled acceptance passes.
