# Change notes

## Phase 1
The hidden three-day preference overrode durations typed into the trip description.
The parser and UI did not shorten plans, but mock responses also ignored the requested duration.
Requests now use a 1–14 day limit and the prompt requires exactly numbered days with at most five stops each.
The server retries a nonempty wrong-day response once with the actual returned count and a corrective instruction.
Demo and delayed mocks now respect days and currency; wrong-days exercises the visible failure path.
