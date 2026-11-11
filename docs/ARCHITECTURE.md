# Architecture

This document describes the current polished code at the Stage 4 checkpoint. The structural plan awaits approval. Stage 5/6 changes must not be inferred from this document.

## Module map

| Responsibility | Entry points |
| --- | --- |
| Step orchestration and rendered screens | src/App.jsx:38 |
| Form validation and place selection | src/components/TripForm.jsx, TripPlaceFields.jsx, Combobox.jsx |
| Request lifecycle | src/hooks/useGenerate.js:13, useCooldown.js |
| Lookup cache and request budget | src/hooks/useDebouncedSearch.js:16 |
| HTTP factory and configuration | server/app.js:29, server/config.js, server/index.js |
| Place search and hub lists | server/geo/routes.js, provider.js |
| Journey engine and fares | server/journeys/engine.js, routes.js, fares.js, fareChecks.js |
| Schema contracts | shared/schemas.js, places.js, journeys.js, planSchema.js |
| Editing and costs | src/itineraryReducer.js, src/costs.js:9 |
| Snapshot building and loading | scripts/build-data/, server/data/index.js:138 |

## Request flow

1. The form commits dataset/geocoder selections. Typed but unselected destination text is invalid.
2. The browser posts validated trip details to /api/options. The model supplies stay, local and food choices.
3. The server returns route structure from /api/journeys/structure before the separate /api/journeys/fares request finishes.
4. The selected route ID, hub IDs and requested preferences accompany /api/plan. The server rebuilds the eligible journeys and verifies the selection.
5. The server computes arrival and leave-by timing, builds the prompt and validates the model's currency and day count. The browser normalizes accepted output and adds IDs.
6. A usable new plan resets edit history and packing state. Failed replacement requests retain the previous usable plan.

Evidence is App.jsx, server/app.js:187, shared/journeyTiming.js:21 and src/hooks/useItinerary.js.

## Validation layers

The setup schema rejects unknown fields and numeric strings. Place schemas restrict coordinates to the supported India bounds. resolveTripPlaces checks district/state membership and hub IDs. Journey requests have their own strict shape. Fare output must cover computed leg IDs and contain finite positive tier amounts no greater than 1e9. parseOptions salvages usable local options, while user-edited prices are checked strictly.

Server itinerary validation checks bounded fields, currency, day labels and count. Browser salvage can drop individual malformed stops from an otherwise usable envelope. These have intentionally different strictness. Evidence is shared/tripInput.js, shared/schemas.js:87, server/tripPlaces.js, server/planSchema.js and src/schema.js.

## Stale responses and cancellation

useApiCall increments latestId for new requests and cancellation. Every asynchronous result checks its request ID. AbortController stops the browser request and cleanup invalidates unmounted work. The 30-second browser deadline includes its one invalid-response retry. An HTTP failure is shown directly.

useDebouncedSearch aborts superseded requests and uses a current flag before applying or caching results. It caches normalized queries for ten minutes and caps one page at 24 uncached lookups per minute. The server lookup budget remains 30 per IP, so tabs and shared IPs can still contend. useCooldown interprets Retry-After and disables retries until expiry.

Browser cancellation does not guarantee that Express stops its provider call. Express has its own provider deadline. Evidence is useGenerate.js:13, useDebouncedSearch.js:16 and shared/retryAfter.js.

## Cost formula

For each leg, multiply the selected-tier one-way fare by travelers for per-person pricing, or by ceil(travelers/4) for vehicle pricing. Sum legs and multiply by two when returning the same way. Children count as paying travelers.

Stay is room price × rooms × max(days-1,0). Default rooms are ceil(adults/2). Local transport is daily rate × days, multiplied by travelers for per-person pricing. Food is daily meals × days × travelers. Activity estimates are per-person stop costs multiplied by travelers. Contingency is 10% of the subtotal when enabled. Intl.NumberFormat formats the requested currency without conversion.

Missing leg estimates are excluded with an explicit notice. Display rounding can differ from summing already-rounded display strings. Evidence is src/costs.js:9 and src/costs.js:71, with fixed characterization snapshots in src/__snapshots__/costSnapshots.test.js.snap.

## Journey engine and evidence

The engine searches directional historical rail edges for direct or one-change rail paths, considers flight hints and configured connecting hubs, adds first/last mile road legs, and limits direct road candidates by distance. It ranks and diversifies at most five candidates with at most four legs.

Duration includes the documented transfer buffers. IDs are hashes of stable route facts. Rail evidence is from 2016 and flight hints from 2014. snapshotAvailability supplies source labels and booking/search links. It does not check live inventory. Evidence is server/journeys/engine.js:225, constants.js and availability/provider.js.

Fare warning checks preserve amounts. They compare per-km values with same-mode/tier medians, and use rough INR ranges only for INR. Zero-distance legs are excluded from division. Evidence is fareChecks.js:8 and FARE_REFERENCE_RANGES.md.

## Data pipeline

The fetch step downloads approved public datasets into ignored data/raw. The builder streams the large railway schedules, writes processed JSON and a gzip graph, and the checker validates IDs/counts and records source gaps. Runtime loadData validates and indexes committed data once. WeakMap engine indexes are reused for the same loaded object.

Evidence is scripts/build-data/build.js, core.js, check.js, server/data/index.js:98 and DATA_SOURCES.md. Historical state labels and sparse coverage remain documented in DATA_QA.md.

## Error handling and limits

Express caps JSON at 10 KB, validates query shapes and hides request/parser internals. Planning and journey endpoints share 10 requests per minute, geo/hubs share 30 and health/other API routes use 60. Provider key, access, quota, model, temporary-error and timeout conditions receive fixed messages. Gemini 429 responses carry a sanitized Retry-After.

Mocks preserve successful endpoint contracts where success is intended. Deliberately malformed/empty/wrong-day modes are fault cases, not successful-shape contracts. Demo/live mode metadata is safe for display. Evidence is server/app.js, server/contracts.test.js, server/app.test.js and config.test.js.

## SOLID and YAGNI status

The current code already uses a createApp factory, pure cost arithmetic, reusable validation and provider injection seams. Stage 3 separated countdown state into one hook shared by requests and lookups. Before that change, failed requests exposed no countdown and identical lookups fetched repeatedly. After it, useCooldown and the lookup cache implement those responsibilities with focused tests.

The proposed structural changes, rejected abstractions and measurements are in REFACTOR_PLAN.md. CLEANUP_LOG.md and REFACTOR_LOG.md explicitly record the approval gate. No before/after structural improvement is claimed while that gate is pending.
