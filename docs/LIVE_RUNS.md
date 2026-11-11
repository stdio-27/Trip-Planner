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
