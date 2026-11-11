# Proposed fare warning ranges

Written before adding the Stage 3c constants. These are deliberately broad diagnostic thresholds chosen by Codex, with no claim of market-price accuracy.

| Mode | Proposed basic/standard/premium warning range in INR per km | Reasoning |
| --- | --- | --- |
| Train | 0.1–20 | Broad enough to include the existing illustrative train rate and higher class estimates |
| Flight | 1–100 | Broad enough to include the existing illustrative flight rate, while flagging extreme values |
| Bus | 0.2–30 | Broad enough for different service levels in a rough distance estimate |
| Cab | 3–100 per vehicle | Allows a wide spread around the existing illustrative vehicle rate |

The existing demo rates are in server/journeys/fares.js. These proposed thresholds are engineering guardrails, not researched fare recommendations. Minimum fares and short trips can exceed a per-km range. Every warning remains editable and non-blocking.

Relative checks compare each tier's fare per km with the median of that mode in one response, using 4× and 0.25× as requested. Zero-distance legs are excluded from per-km checks. Other currencies receive relative checks only. Real-world suitability and the user's acceptance of these reference ranges remain UNVERIFIED.
