# Input audit — v2 Phase 1

| Field / option | Where used | Decision and evidence |
| --- | --- | --- |
| destination, originCity | options/plan prompts and demo hubs | Keep text temporarily; replace with dataset-backed pickers in Phase 4. |
| nearestAirport, nearestStation | options prompt and demo hubs | Keep temporarily; later replace with verified dataset ids. |
| days | prompt, exact-count checks, room nights, food/local totals | Keep visible 1–14 selector. |
| adults, children | all per-person totals and prompt | Keep; tighten to 1–9 / 0–9. |
| rooms | accommodation multiplier | Keep optional override; tighten to 1–9. |
| budget | under/over-budget panel | Keep optional integer 0–10,000,000. |
| currency | prompts and Intl formatting | Keep curated shared enum; no conversion. |
| startDate | model season/date context | Keep; now today through today+365 only. |
| pace | itinerary prompt | Keep shared enum. |
| interests | itinerary/options prompts | Replace comma-separated text with shared enum array. |
| anythingElse | model context | Keep notes; normalize whitespace/control characters and cap at 300. |
| foodPreference + foodOther | both prompts | Keep controlled preference; Other remains because its explanation reaches the model. |
| description | legacy validator fallback and App default only | Remove: no visible field edited it after the destination form replaced the free-form version; it duplicated destination and weakened required-destination validation. |
| international example buttons | set destination and days only | Remove: old Tokyo/Kyoto/Paris/Vancouver shortcuts conflict with the pack's India-only release and duplicate the explicit destination/day controls. Existing day-count regression now uses the actual selector. |
| Cheapest combo / Balanced / Comfort | presetSelections and selected cost totals | Keep: tests establish selection and cost changes. |
| travel comfort, stay/food tiers | preset ranking, option labels, selected prompt context | Keep; share enum constants. |
| travel mode, stay type, local pricing | selected prompt context / per-group cost branch | Keep finite enums, including Other as the parser's explicit custom-option fallback. These entries are consumed, not dead choices. |
| editable estimates, contingency | pure cost module | Keep; directly change totals. |
| selected option ids | current in-memory option lookup | Keep for current flow only; these are not authoritative geographic ids. Phase 4 must validate geographic ids against real datasets. |

No real geographic dataset is used in Phase 1; free-text hubs are deliberately not represented as verified places.
