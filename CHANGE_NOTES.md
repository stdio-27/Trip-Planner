# Change notes

## Phase 1
The hidden three-day preference overrode durations typed into the trip description.
The parser and UI did not shorten plans, but mock responses also ignored the requested duration.
Requests now use a 1–14 day limit and the prompt requires exactly numbered days with at most five stops each.
The server retries a nonempty wrong-day response once with the actual returned count and a corrective instruction.
Demo and delayed mocks now respect days and currency; wrong-days exercises the visible failure path.

## Phase 2
The setup now asks explicitly for origin, destination, days, dates, travelers, rooms, pace, interests and food needs.
A shared pure validator applies the same rules in the browser and on the server.
The day selector is always visible and displays the derived number of nights.
Origin hubs can be left blank so the options step can show inferred assumptions.
Currency defaults to INR and text is trimmed before it reaches the model.

## Phase 3
Both API endpoints now use the same cancellation, timeout and stale-response hook.
The new options endpoint estimates travel, stays, local transport and food before an itinerary is built.
Four radio groups support independent choices, presets and editable prices, including custom empty-group fallbacks.
The screen shows inferred hubs, assumptions and an immediately updating estimate summary.
Demo options work without an API key, and Back preserves the entered form values.

## Phase 4
A pure cost function computes round-trip travel, room nights, local transport, food and per-person activities.
Children count as full-price travelers, rooms default from adult count, and contingency adds ten percent.
The selected combination is validated and sent to the model so itinerary routes reflect those choices.
Stops exclude separately budgeted categories, and removing or restoring stops updates the activity estimate.
Changing setup requires new options; successful replacement results reset selections while cancellation preserves the existing plan.

## Phase 5
Regression tests cover explicit day counts, retries, both request lifecycles, option salvage, edits and cost arithmetic.
A seven-day demo completed the browser flow, including keyboard activation and 360px, 390px and 768px overflow checks.
The audit reports zero advisories and the built bundle contains neither the API key variable nor the configured key.
Automated endpoint and hook checks cover failure modes; not every failure mode or OS color scheme was manually exercised.
Optional localStorage persistence is deliberately omitted so this release keeps session data in memory.

## v2 Phase 1 — strict input foundation
The audit traced every field and removed the unused description alias and international shortcuts.
Shared Zod schemas now reject unknown keys, numeric coercion, out-of-range dates and invalid enum choices.
Numeric controls keep raw edits, block exponent/sign input, clamp on blur and show accessible field errors.
Core/server checkJs now passes; the remaining UI typing categories are listed separately for later work.
The app still uses illustrative demo hubs; Phase 2 waits for real source files instead of inventing geographic data.

## v2 Phase 2 — reproducible data layer
The build downloads and fingerprints public source files automatically, so no manual raw-file placement is required.
LGD state and district totals are compared to the source, and large railway schedules are streamed twice.
Station state inference, junction selection and compressed graph construction are documented with source limits.
The server validates and indexes the committed processed datasets once, with no runtime downloads.
The QA report lists every state, unresolved coverage and isolated junctions before any picker or journey UI is added.

## v2 Phase 3 — places API
The server serves states, districts, airports and major junctions from the bundled snapshots.
Place search uses a replaceable Open-Meteo provider with a five-second deadline.
A bounded cache reuses place lookups while each request applies its own state filter.
Nearby hubs use straight-line distance and search ranks exact codes ahead of name matches.
Validation, mock outages and upstream errors are covered by API regression tests.

## v2 Phase 4 — place and hub pickers
The form now selects origin state and district and commits a destination from the place list.
The shared combobox supports keyboard navigation and ignores responses from superseded searches.
Nearby hub lists and bundled search let users select or opt out of each mode.
The server validates geographic references and resolves selected hub names from the snapshots.
Tests cover keyboard selection, state resets, Back, outage fallback, stale results and request validation.

## v2 Phase 5 — journey engine
The server builds journeys from the bundled rail graph, flight hints and estimated road connections.
Each leg records its evidence, source year and planning buffer so the interface can explain the estimate.
Journey ranking balances duration, changes and a mode-based cost heuristic and limits the result to five candidates.
Gemini receives leg facts for fares while failed estimates leave the route structure available for a fare-only retry.
Fixture and HTTP tests cover rail changes, flight connections, historic evidence, fare validation and north-east coverage.
