# Live Gemini verification

Run on 11 November 2026 IST against the local Express API with the configured Gemini key. The model metadata request returned HTTP 200 for `gemini-flash-lite-latest` and included `generateContent`. Each itinerary used the first route returned by the bundled engine and submitted the selected route ID, hubs, preferences and local options to `POST /api/plan`.

| Scenario | Trip | Routes | Chosen route | Approximate arrival | Requested / returned days | Plan status |
| --- | --- | ---: | --- | --- | --- | --- |
| North-east to metro | Guwahati (Kamrup Metro) → New Delhi | 3 | Cab + flight | 12:45 | 3 / 3 | 200 |
| Metro to metro | New Delhi → Mumbai | 1 | Cab + flight | 11:54 | 3 / 3 | 200 |
| Small town to small town | Tonk → Kishangarh | 2 | Cab | 10:16 | 3 / 3 | 200 |
| Short same-state | Jaipur → Ajmer | 4 | Train | 10:10 | 2 / 2 | 200 |
| One day | Ajmer → Kishangarh | 2 | Cab | 08:35 | 1 / 1 | 200 |
| Fourteen days | Kolkata → Guwahati | 3 | Cab + flight | 11:24 | 14 / 14 | 200 |

All six used an 18:00 last-day leave-by time. Stops with parseable 24-hour clock times on the arrival and final days fell within their respective windows. The north-east case also used live `/api/options` and `/api/journeys/fares`, both of which returned valid results. The other five cases used deterministic local option fixtures to isolate live itinerary generation. No live itinerary request failed on this run. New Delhi → Mumbai returned only one candidate under the selected hubs and historical snapshots.

The route durations, arrival estimates, and generated fares do not confirm current schedules or booking availability.

## Post-refactor rerun — 12 November 2026

The six scenarios were repeated through the final composition/services on f4285c4, using the configured backend key. Model metadata again returned 200 and supported generateContent.

| Scenario | First final-code attempt | Bounded retry | Final returned days |
| --- | --- | --- | ---: |
| NE to metro | 200, 12.3 s; options 200, fares valid, zero flagged legs | Not needed | 3 |
| Metro to metro | Provider 503 → app 502, 1.3 s | 200, 6.3 s | 3 |
| Small towns | 200, 2.6 s | Not needed | 3 |
| Short same-state | Provider 503 → app 502, 4.0 s | 503 → 502, 1.5 s; final 200, 5.0 s | 2 |
| One day | 200, 1.8 s | Not needed | 1 |
| Fourteen days | 200, 8.0 s | Not needed | 14 |

Every successful final run had the requested day count and no parseable-time arrival/leave-by violation. Routes remained 3/1/2/4/2/3 and selected modes remained Cab+Flight / Cab+Flight / Cab / Train / Cab / Cab+Flight. Only the NE case requested live options and fares; other cases used deterministic local option fixtures to isolate itinerary generation. Current schedules, road realism, every activity description and actual fare accuracy remain UNVERIFIED. A valid price schema and zero warnings do not establish a correct fare.

Evidence: artifacts/master-pack/live-post-refactor.log, live-post-refactor-retry.log and live-post-refactor-final.log. An earlier pre-refactor attempt had persistent fourteen-day 503s and a timeout; those historical failures are retained in live-runs.log, live-retry.log and live-final-retry.log. The final rerun did not change models to obtain a pass. A separate local fresh-clone live one-day request returned 200 in 2.1 seconds (clone-live.log). The initial parallel live check started during npm ci and could not load zod; it was rerun after installation. That was a verification sequencing error, not a provider or app result.
