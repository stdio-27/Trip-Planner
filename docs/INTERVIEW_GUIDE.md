# Interview guide

Answers describe the current code. Follow the cited files while explaining them. Proposed refactors remain proposals until the Stage 4 plan is approved.

## Major modules and likely questions

| Module, purpose and design reason | Three questions and grounded answers |
| --- | --- |
| App.jsx:38 coordinates the three-step workflow and selected trip. Keeping the committed trip separate preserves a usable result during edits. | **Why a pending trip ref?** It associates asynchronous options with the submitted trip. **Why reset journey choice?** A different origin/date/traveler input invalidates the old route context. **Does changing a price call Gemini?** It recalculates local costs. Rebuilding the itinerary is explicit. |
| TripForm.jsx:23 and shared/schemas.js:87 validate setup. Shared contracts align the browser and API. | **Why strict objects?** They reject unexpected input fields. **Why not coerce API strings?** API types remain explicit, while formPayload converts digit strings from controls. **Why IST dates?** dateBounds uses the Asia/Kolkata calendar and a 365-day limit. |
| Combobox.jsx:4 and useDebouncedSearch.js:16 handle place selection. Committed rows separate real selections from text. | **What does typing do?** Clears the old selection. **How are repeated calls avoided?** Normalized successful results have a ten-minute cache. **Can other tabs cause a 429?** Yes, the backend limit is shared per IP. |
| useGenerate.js:13 and useCooldown.js:2 own request lifecycle. The request ID handles races that cancellation alone cannot rule out. | **Why both abort and latestId?** An older response may resolve around cancellation. **When is retry automatic?** Once for invalid successful bodies, not arbitrary HTTP/network failures. **Does cancel stop Gemini?** It stops the browser request, while the server may finish its separate call. |
| server/app.js:29 and config.js:2 expose HTTP behavior. Provider failures are mapped to fixed messages. | **Where is the key?** The server environment, never the browser payload. **How is a journey trusted?** Its ID and ordered hub list are checked against the engine. **How is demo identified?** The health contract returns demo/live mode and the header shows Demo data. |
| journeys/engine.js:225 and fares.js:50 separate route facts from estimated prices. | **Does Gemini invent the route?** Structure comes from the bundled graph and heuristics. **What is a route hint?** Historical flight-route evidence, not inventory. **Why warning rather than rejection for unusual prices?** A per-km heuristic can be wrong, especially for minimum fares. |
| costs.js:9 composes the budget. Pure inputs make arithmetic testable. | **How are vehicles charged?** Fare × ceil(travelers/4). **Are children discounted?** No, they count as paying travelers. **What avoids double counting?** The prompt excludes already-budgeted base travel/stay/local/meals from activity costs. |
| itineraryReducer.js:71 and useItinerary.js:7 manage edits and undo. Immutable history retains earlier states. | **How large is undo?** MAX_UNDO_HISTORY is 20. **What happens on a usable new plan?** History and packing state reset. **Why UUIDs?** Stable item identity supports edits and reordering. |

Evidence is the named modules, src/requestLifecycle.test.js, src/costs.test.js, src/itineraryReducer.test.js and server/app.test.js. Check the implementation before claiming stronger guarantees.

## Ten bug-spotting drills

Plant these only in a disposable copy.

1. Remove a latestId check in useGenerate. Older requests may overwrite new ones. Restore the check after asynchronous boundaries.
2. Remove the lookup current guard. A cancelled query may cache or display an obsolete response. Restore the cleanup guard.
3. Drop the room multiplier in computeCostBreakdown. Two rooms cost the same as one. Inspect the stay formula.
4. Replace ceil(travelers/4) with floor. A group of five underpays for vehicle capacity. Inspect journeyLegCosts.
5. Double the entire subtotal for returns. Meals/stays become duplicated. Apply the return multiplier only to travel legs.
6. Remove the journey-ID verification. An unsupported client route can reach the prompt. Check server/app.js selection reconstruction.
7. Remove the fare upper bound. Very large finite numbers can overflow totals. Run QA-H1.
8. Keep history after LOAD. Undo can restore a previous trip. Inspect itineraryReducer's LOAD branch.
9. Cache unsuccessful geocoder responses as normal data. A temporary fault can suppress a valid retry. Cache successful lookup results only.
10. Remove the arrivalDay field from the prompt context. Activities may precede arrival on a long journey. Follow shared/journeyTiming.js and buildTripPrompt.

## Ten small-feature drills

These are practice proposals, not changes already implemented.

1. Change contingency to 15%. Hint: costs.js and its snapshots.
2. Add a half-price child travel policy. Hint: separate passenger pricing from vehicle capacity.
3. Add a fare tier. Hint: shared fare schema, estimator prompt, selectors and plausibility checks must agree.
4. Sort journeys by selected-tier group price. Hint: use the existing pure leg-cost calculation.
5. Copy itinerary as text. Hint: format the current edited plan, not the original response.
6. Add a new dietary preference. Hint: shared choices, strict schema and form select.
7. Add a per-person budget display. Hint: existing perPerson total and currency formatter.
8. Export a packing checklist. Hint: combine generated and custom items with checked IDs.
9. Add another availability source. Hint: preserve evidence year and avoid calling a hint live inventory.
10. Save a versioned session. Hint: validate restore data, handle storage exceptions and test corruption/clear behavior.

## Glossary

- **AbortController** cancels an in-flight browser or provider request.
- **latestId** identifies the newest valid browser request.
- **Zod** validates runtime input and output shapes.
- **Salvage** keeps valid items from a partially malformed response.
- **Reducer** computes a new edit state from an action.
- **Immutable update** creates a replacement state rather than mutating history.
- **Characterization test** records current behavior before refactoring.
- **Contract test** checks a boundary's agreed response shape.
- **Composition root** chooses and wires dependencies in one place.
- **YAGNI** rejects unused or speculative machinery.
- **SOLID** describes responsibility and dependency boundaries.
- **Route hint** is historical route evidence.
- **TTL** is the lifetime of a cache entry.
- **Retry-After** communicates when another request may be attempted.
- **Per-vehicle pricing** charges for groups of up to four in this app.
