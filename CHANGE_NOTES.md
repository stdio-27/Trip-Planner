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
