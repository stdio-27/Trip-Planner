# Trip Planner

Plan a trip within India with bundled transport snapshots and Gemini-generated price estimates and itineraries.

## Setup

Use Node.js 22.22.2+ in the 22.x line, or Node.js 24.15.0+, and npm.

```sh
npm install
npm start
```

Open [localhost:5173](http://localhost:5173). Vite forwards `/api` to Express on port 8787. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` for live generation. Keep credentials in the server environment. Use `MOCK=demo` for keyless estimates and itineraries. The place search still uses Open-Meteo unless an arrival hub is selected directly or a geocoder mock is enabled.

If either port is occupied, stop the previous instance or set `VITE_DEV_PORT` and `PORT` in `.env`. Run `npm run start:prod` to build and serve the compressed client from Express.

## Planning flow

1. Select the origin state and district, destination, and transport hubs. If a place search fails, use the bundled hub search. Specify trip length, travelers, and departure preferences.
2. Choose a journey, fare tier, and return or one-way travel. Expand individual legs to see their evidence, buffer, booking link where available, and editable fare estimate. Pick stay, local transport, and food estimates separately.
3. Build the itinerary using the selected route, approximate arrival, last-day leave-by time for return trips, and local transport choice. Rebuild after changing options that should affect the itinerary. The itinerary supports stop reordering, removal, undo, and a packing checklist.

Travel uses the sum of each one-way leg's fare multiplied by travelers for per-person pricing or by one vehicle per four travelers, rounded up, for per-vehicle pricing. The return toggle doubles this estimate. Children count as paying travelers. Stay uses rooms × nights × nightly rate, with zero nights for a one-day trip. Local transport uses the daily rate per group or person, and meals and activities use per-person amounts. The optional contingency adds 10%. Missing fares are called out in the cost summary and excluded until supplied.

## Architecture

```text
React setup, journey and itinerary screens
  └─ /api through Vite in development or Express in production
       ├─ geo and hubs → Open-Meteo Geocoding + bundled LGD and hub indexes
       ├─ journeys/structure → bundled rail graph, flight hints and road estimates
       ├─ journeys/fares → Gemini using computed leg facts
       └─ options and plan → Gemini with validated trip and journey context
```

Zod validates trip inputs and model output. Express verifies the selected journey and ordered hub IDs and computes itinerary timing from the bundled route. The browser loads place-picker code as a separate chunk. Journeys can render while fare estimates are pending. The server loads snapshots once at startup and compresses production static responses for supported clients.

| Command | Purpose |
| --- | --- |
| `npm start` or `npm run dev` | Start the frontend and API |
| `npm run start:prod` | Build and serve the production app |
| `npm run build` | Build the frontend |
| `npm test` | Run unit, UI and API regression tests |
| `npm run typecheck` | Check the shared, server and cost modules |
| `npm run data:fetch` | Download source snapshots to ignored `data/raw/` |
| `npm run data:build` | Build processed snapshots and validate them |
| `npm run data:check` | Check bundled data and print source counts and regional gaps |
| `npm audit` | Check dependencies for known advisories |

## Failure modes

Set `MOCK` in `.env` and restart Express. For `bad-json`, `bad-shape`, `empty`, `fail`, `slow`, and `jitter`, add `MOCK_STAGE=plan` to use working demo options and isolate the itinerary stage. Failure paths are covered across HTTP, request-hook and UI tests. Browser checks and live model results are recorded separately.

| Mode | Visible behavior and recovery | State retained |
| --- | --- | --- |
| `geo-down` | Search unavailable with Retry and direct hub search. | Entered search and setup details. |
| `geo-slow` | Searching, then the same outage fallback when the search times out. | Search and setup details. |
| `geo-empty` | No matches. Refine the search or choose a bundled hub. | Search and setup details. |
| `fares-bad-json`, `fares-fail` | Fare estimates are unavailable. Edit prices or use Estimate prices again. | Routes, selected journey, tier and edits. |
| `journeys-empty` | No route matched or no hub is in range. Change hubs returns to setup. | Setup selections. |
| `options-bad-shape`, `bad-shape`, `bad-json` | Invalid-response message after one client retry. Try again. | Setup and any previous usable itinerary. |
| `options-empty`, `empty` | No itinerary to show yet. Try again or edit setup. | Setup and any previous usable itinerary. |
| `fail` | Server error with Try again. | Setup and any previous usable itinerary. |
| `slow` | Loading and Cancel, followed by a timeout and Try again after 30 seconds. | Setup and any previous usable itinerary. |
| `jitter` | Loading until completion. Cancelling or starting a new request invalidates stale responses. | Setup and the last usable itinerary until a replacement arrives. |
| `wrong-days` | Wrong itinerary day count triggers one client retry and then an error. | Setup, journey, and any previous usable itinerary. |
| `demo` | Illustrative prices and itineraries for the requested duration. | Same in-session editing behavior as live mode. |

## Limits and data sources

- Rail timetable matches use the **2016** datameet snapshot. Flight hints use **2014** OpenFlights routes. Road travel, buffers, and arrival times are approximate. Fares are AI estimates. Verify service, departure times, and prices with IRCTC or the relevant airline before booking.
- Routes can be sparse in regions with incomplete snapshot coverage. A route result can contain fewer than three candidates. [Data QA and regional gaps](docs/DATA_QA.md)
- Attribution includes datameet/railways (CC0), OurAirports (public domain), OpenFlights (ODbL/DbCL), LGD via the ramSeraph mirror (GODL-India), and Open-Meteo Geocoding with GeoNames (CC BY 4.0 location data and non-commercial free hosted endpoint). [Data sources and licenses](docs/DATA_SOURCES.md)
- Trips support 1–14 days, 1–9 adults, 0–9 children and 1–9 rooms. Dates are checked in the Asia/Kolkata time zone. Approximate timing uses 08:00, 13:00, 18:00 and 22:00 anchors for the four departure preferences.
- Express caps JSON requests at 10 KB. Per-IP limits are 30 lookup requests, 10 planning and journey requests, and 60 health or other API requests per minute. Limits are per process. The browser uses a 30-second deadline and offers cancellation while generating options or an itinerary.
- The app stores trip and edit state in memory for the current page session. A full reload clears it. Loading the app and fetching new data require access to the app server.
- Generated activities and estimates need review. The app has no bookings, live seat inventory, currency conversion, or persisted user accounts. [Live Gemini verification](docs/LIVE_RUNS.md)

## AI usage note

OpenAI Codex implemented and verified the planning flow and v2 phases. Google Antigravity contributed earlier review, QA and engineering fixes. Google Gemini generates fare, local option and itinerary estimates at runtime.

## Time spent

Time spent: **[enter time spent, e.g. 4.5 hours]**
