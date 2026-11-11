# Refactor plan awaiting approval

The master pack's Stage 4 explicitly requires approval before Stages 5 and 6. This is the concrete reviewable plan. No production refactor is authorized by this report alone.

## Measurements

The pre-refactor tag is `pre-refactor`, pointing to `4d97b95`. The Babel AST inventory in `artifacts/master-pack/metrics-before.json` found 51 tracked production JS/JSX files. The largest files were server/app.js (475 lines), src/App.jsx (360), TripPlaceFields.jsx (305) and journeys/engine.js (289). The longest functions were createApp (446 lines), App (322), the plan/options callback (244) and useApiCall (209). Reproduce with `node artifacts/master-pack/metrics.mjs`.

Madge reported `[]` for circular dependencies with JS and JSX extensions. The JavaScript jscpd 3.5.10 run reported zero clones at its default threshold across the requested scan. Depcheck reported no unused runtime dependency and suggested @types/compression and @types/express as unused development dependencies. Those suggestions are rejected because the blocking check uses their declaration types.

The current native jscpd executable and knip's resolver were blocked by Windows Application Control. The completed alternatives were `npx jscpd@3.5.10` and `npx depcheck`. Outputs are in `artifacts/master-pack/jscpd-before/`, `madge-before.json` and `depcheck-before.json`.

The production assets measured 332,137 bytes for the main JS chunk, 8,703 for the picker chunk and 25,656 for CSS. Gzip sizes were 104,977, 3,301 and 6,395 bytes respectively. These are the Stage 3 output sizes, not the Stage 1 baseline.

## Proposed work, ordered by risk and benefit

| ID | Evidence and principle | Smallest proposed change | Risk and benefit |
| --- | --- | --- | --- |
| Y1 | BudgetSummary has no importing production or test file. `rg -n BudgetSummary src server shared` finds only its declaration. YAGNI. | Remove that unused component, preserving the active OptionsPicker CostPanel and cost tests. | Low. Removes an obsolete competing presentation. |
| Y2 | COMFORTS and TRAVEL_MODES occur only in shared/choices.js declarations after legacy travel options were removed. YAGNI. | Remove those two unused exports. | Low. Removes misleading unused domain choices. |
| S1 | The pure engine imports distanceKm from the Express geo router module. server/journeys/engine.js:2. Single responsibility and dependency inversion. | Move the existing haversine function unchanged into a shared pure module and update callers. | Low. Removes HTTP dependency from route search. |
| S2 | server/app.js mixes transport, provider calls, prompt construction, mock behavior and validation. Its callback spans 244 lines. S and D. | Extract planning/options service and provider adapters, then inject them through one server/composition.js while retaining createApp(options) compatibility for existing callers. Routes parse, call services and shape HTTP responses. | Medium/high. Makes live and fault behavior independently testable. |
| S3 | MOCK/env choices occur in app.js and journeys/routes.js, while geocoder faults are in geo/routes.js. D and L. | Choose demo/live/fault implementations only in the composition root. Run common response-shape contracts against demo and HTTP-mocked live clients. | Medium/high. Removes transport-specific mode branching while preserving every documented mock. |
| S4 | App contains step markup, network orchestration, journey invalidation and cost inputs. App is 322 lines. S and I. | Move data orchestration into focused hooks and render SetupStep, OptionsStep, JourneyStep and ItineraryStep using only the fields/callbacks each needs. Preserve the three visible planning steps. | Medium. Separates lifecycle changes from presentation changes. |
| I1 | ItineraryView and DayBoard pass reducer dispatch while using only remove/move actions. I. | Pass named callbacks and days/currency to presentation. Group files by existing feature only while updating every import. | Medium. Reduces reducer coupling and clarifies ownership. |

## Rejected or retained work

- No journey strategy registry is justified. buildJourneys selects by distance and invokes existing rail/flight/road helpers. It does not contain a three-way mode-dispatch chain. Stage 6c's rule-of-three condition is not satisfied.
- Keep the current cohesive cost module. Per-category files would add more indirection than the existing pure arithmetic warrants.
- Keep the geocoder wrapper. It contains real validation/timeout behavior and is replaced by fixtures in HTTP tests.
- Keep NoLiveProvider for now. Its interface is a documented Phase 5 requirement and has a contract test.
- Keep @types/compression and @types/express despite depcheck's suggestions. Type declarations are used by checkJs and middleware typing.
- Do not remove CSS based only on a name search. Dynamic classes, drag states and responsive rules require browser evidence. Dead CSS beyond the unused component is a question for review.
- Do not add persistence, context, memoization, base classes, plugins or a global state library.

## Safety and acceptance

The Stage 4 safety net comprises `src/goldenFlow.test.jsx` (actual Node demo server and UI), `server/contracts.test.js` (all successful API endpoints) and `src/costSnapshots.test.js` (five fixed inputs). The server in the golden test runs in a child process because Vite rewrites import.meta.url inside JSDOM.

For each approved change, run the unchanged golden path and contracts, npm test, npm run typecheck and npm run build. Compare the five sanity-route journey arrays byte-for-byte. Record file/function counts, circular dependencies, bundle bytes and repeated startup measurements in REFACTOR_LOG.md. Revert a refactor that regresses existing expectations.

Approval is pending. The production changes in Stages 5 and 6 must wait for the user's decision. Documentation that describes the current code can proceed independently.

## Measured safety-net coverage

The coverage run completed with 268 tests passing in 27 files. Aggregate line coverage was 91.19% and branch coverage 81.10%. Selected modules were app.js 76.74% lines / 58.89% branches, journey engine 100% / 83.56%, journey routes 100% / 88.46%, App.jsx 95.83% / 88.57%, costs.js 100% / 100% and useGenerate 93.96% / 85.71%. Evidence is artifacts/master-pack/coverage/coverage-summary.json. These are measurements, not a claim that every semantic case is covered.
