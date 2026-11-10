# Verification record

The original three-day issue came from the hidden structured default, which overrode typed durations. Successful mocks separately ignored the requested count. Neither parser nor view truncated plans.

## Completed checks
- Every phase ran npm test and npm run build before its implementation commit.
- The final suite covers schema salvage, numeric normalization, date validation, origin fields, options presets, exact day enforcement, shared lifecycle cancellation/timeouts/staleness, cost arithmetic and three-step component interactions.
- A browser demo completed setup → options → seven-day itinerary. The cheapest preset changed totals without an AI call. Enter activated actions and the seventh tab.
- Browser overflow measurements: 360px viewport / 345px content; 390px / 375px; 768px / 753px. The difference is the scrollbar, not lost content. Scrollable day tabs intentionally keep their own horizontal scroll.
- The browser console reported no errors or warnings during the demo.
- A clean source-only snapshot (no .env or node_modules copied) installed dependencies successfully, then npm start served Vite on 5188 and Express on 8801. The Vite /api/options proxy returned INR and three travel choices; health returned true. The isolated processes were stopped afterward.
- npm audit reported zero vulnerabilities. The built JavaScript did not contain GEMINI_API_KEY or the configured key value. No credentials were printed or committed.

## Failure-mode coverage
| Mode | Expected behavior | Evidence |
| --- | --- | --- |
| demo | options and exact requested days/currency | browser and endpoint tests |
| bad-json | one browser retry then error | parser/lifecycle and endpoint tests |
| bad-shape | one browser retry then error | component/lifecycle and endpoint tests |
| empty | empty state | component and endpoint tests |
| fail | error with Retry | component and endpoint tests |
| slow | 30-second browser timeout or Cancel | shared-hook fake-timer tests; not manually waited for both endpoints |
| jitter | older responses cannot overwrite newer requests | shared-hook deferred-response tests; not manually repeated in browser |
| wrong-days | one client retry then error | day-count hook regression for 1,2,3,5,7,14 |
| options-bad-shape | options parse failure then Retry | options schema and endpoint tests |
| options-empty | options empty state | component and endpoint tests |

## Honest limits
- Not every mock mode was manually exercised in a browser; the table distinguishes automated evidence from browser evidence.
- A complete Tab-only traversal and both OS color modes were not manually verified. Enter activation and native radio semantics were checked; the fixed cream theme intentionally ignores OS color preference.
- No new live Gemini generation was used for this feature verification; demo and simulated provider responses establish shape/control flow, not estimate quality.
- This clean-install check used a source snapshot, not a remote git clone. It used alternate local ports to avoid conflicting with the user's running app.
- Demo amounts are illustrative in the requested currency, not converted or destination-specific prices.
- Optional localStorage persistence was omitted. Data remains in memory.
- Two existing Zod/Rollup comment-annotation build warnings remain; they do not prevent a successful build.
