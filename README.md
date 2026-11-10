# Trip Planner

A React itinerary planner powered by a small Express API and the Gemini
`gemini-flash-lite-latest` model. The client can be run with mock API response modes
while developing.

## Requirements

- Node.js 20 or newer
- npm
- A Gemini API key to generate real itineraries

## Setup

Install dependencies:

```sh
npm install
```

Create a `.env` file in the project root for real Gemini requests:

```dotenv
GEMINI_API_KEY=your_gemini_api_key
```

Keep the API key on the server; do not put it in a `VITE_` variable or commit
the `.env` file.

Start the Vite client and Express API together:

```sh
npm start
```

Or run dev mode with `npm run dev`. Vite runs on `http://localhost:5173` and proxies `/api` requests to Express on `http://localhost:8787`.

To run production mode (build client and serve static assets via Express):

```sh
npm run start:prod
```

To run either process by itself, use `npm run client` or `npm run server`. Build the client with `npm run build`. Run unit and integration tests with `npm test`; use `npm run test:watch` while developing.

## Architecture

```text
React UI -> Vite /api proxy -> Express -> Gemini LLM
                                      <- JSON response
React hook -> Zod validation and normalization -> itinerary UI
```

- **React UI:** `src/App.jsx` coordinates the trip form, generation states, and
  itinerary presentation. Existing results remain visible during replacement
  requests and after errors or empty responses. `useItinerary` owns packing
  checklist edits, resetting them only when a new usable plan arrives.
  `useGenerate` manages requests; `useItinerary` and
  `itineraryReducer` manage edits and undo.
- **Vite proxy:** `vite.config.js` forwards `/api` to the local Express server,
  so the browser uses a same-origin API URL.
- **Express:** `server/index.js` starts the app factory in `server/app.js`, which exposes `POST /api/plan` with a 10 req/min rate
  limiter, a 10KB payload cap, and input validation via `server/validator.js`.
  It calls Gemini with a 25-second timeout and Gemini `responseSchema`. The
  server parses response text with a balanced-brace scanner (`server/extractJson.js`),
  which extracts JSON from markdown fences or surrounding commentary. Live model
  responses are limited to 1 MB and validated on the server for bounded fields,
  non-negative costs, requested currency, and requested day count (or zero days
  for an empty result). The shared transport schema lives in `shared/planSchema.js`.
- **Zod:** `src/schema.js` validates the model response in the browser,
  normalizes categories and estimated costs, and adds client-generated UUIDs.
  Invalid individual stops are dropped while valid stops are retained.
- **UI:** Components render loading/error/empty states, sortable daily stops,
  cost summaries, and an editable local packing checklist.

The expected itinerary shape is:

```json
{
  "title": "A weekend in Kyoto",
  "currency": "USD",
  "days": [
    {
      "label": "Day 1",
      "stops": [
        {
          "title": "Visit a temple",
          "category": "sight",
          "estCost": 0,
          "description": "Allow time to explore the grounds.",
          "location": "Kyoto",
          "time": "09:00"
        }
      ]
    }
  ],
  "packingList": ["Comfortable walking shoes"]
}
```

## Trip duration

Example chips populate both the description and trip length. The Trip length
preference is authoritative when it conflicts with a duration in the description;
changing that preference overrides the example duration. The form validates trip
length and budget before sending a request.

## Handling invalid or unusual AI output

1. **Server response extraction:** The API extracts the outermost JSON object
   from Gemini's text, including when the response is wrapped in markdown. A
   missing object or malformed JSON is returned as an API error.
2. **Schema validation and salvage:** `parsePlan` rejects a response missing
   required top-level fields or with invalid day/packing-list shapes. Within a
   valid day, a malformed stop (for example one with a blank title) is dropped
   and counted; other stops in that day are kept. Empty days remain in the
   itinerary and are listed in `emptyDays`.
3. **Normalization:** Categories are trimmed and lowercased; unrecognized or
   non-string categories become `other`. A non-numeric, negative, or otherwise
   invalid `estCost` becomes `0`. Valid days and stops receive UUIDs on the
   client.
4. **One automatic retry:** `useGenerate` retries once (two attempts total)
   when the HTTP response is successful but its body is invalid JSON or fails
   the required plan shape. Recoverable bad individual stops are salvaged by
   Zod and do not trigger a retry. Empty bodies become the `empty` state;
   non-success HTTP responses become errors without retry.
5. **Stale request protection:** A new generation aborts the previous request.
   The hook also checks a monotonically increasing request ID before applying
   responses, so an older or cancelled request cannot overwrite newer state.
   Aborting on unmount prevents updates after the hook is removed.
6. **Mock modes:** Set `MOCK` in `.env` to test server responses without using
   Gemini:

   | `MOCK` value | Behavior |
   | --- | --- |
   | `jitter` | Returns a valid sample plan after a random delay of up to five seconds, useful for checking request ordering. |
   | `slow` | Waits 40 seconds before returning a sample plan, useful for testing the pending UI and manually aborting a request by starting another. |
   | `bad-json` | Returns malformed JSON; the client retries once, then shows an error. |
   | `bad-shape` | Returns a JSON object with the wrong plan shape; the client retries once, then shows an error. |
   | `empty` | Returns an empty HTTP body; the client enters the `empty` state. |
   | `fail` | Returns HTTP 500; the client displays an error and does not retry. |

   For example, `MOCK=bad-shape` can be added to `.env`. Restart the server
   after changing environment variables. Any unrecognized or unset `MOCK`
   value uses Gemini.

## Known limitations and boundaries

- The app has no user accounts, database, or server-side itinerary persistence;
  edited plans and packing checklist state live in the current browser session.
- Budget totals are estimates derived from each stop's `estCost`; they do not
  include costs omitted by the model.
- The client retries invalid successful response bodies once, but it does not
  automatically retry network failures or non-2xx API responses.
- The client enforces a 30-second request timeout; requests that exceed 30
  seconds abort with a retry option ("This is taking too long. Please try again.").
  Users can also cancel an in-flight request at any time using the Cancel button.
- Rate limiting enforces a maximum of 10 requests per minute per IP address on
  `POST /api/plan`.
- Input limits: Destination is required (1–1,000 characters); Interests is optional
  (max 500 characters); Trip length is bounded between 1 and 30 days.
- Day tabs and stop controls are accessible, but drag-and-drop behavior can
  vary by browser and assistive technology; the keyboard reorder buttons are
  also available.
- The Vite proxy is for local development; in production, Express serves the
  built static assets from `dist/` directly via `npm run start:prod`.

## AI usage note

AI assistance was used to help implement, review, and document this project.
Specifically, Google Antigravity was used for code review, QA auditing, and
engineering fixes. Gemini (`gemini-flash-lite-latest`) generates itinerary suggestions;
its output can be inaccurate, incomplete, or unsuitable for your situation.
Verify opening hours, routes, accessibility, visa and safety requirements, and
all prices before relying on the plan. Estimated costs are suggestions, not
quotes or reservations. Do not send sensitive personal information in trip
details, and review generated code before relying on it.

## Time spent

Time spent: **[enter time spent, e.g. 4.5 hours]**

## Three-step planning and estimate model

1. Enter destination, origin hubs, 1–14 days, dates, travelers, rooms and preferences.
2. `POST /api/options` returns independent travel, accommodation, local transport and food estimates. Select or edit any combination; Back preserves inputs.
3. Build the itinerary with `POST /api/plan`. Selected modes, stay area and pace are sent to the model. After generation, changing option selections only recalculates costs; rebuild the itinerary if routes should reflect those changes.

Travel is round-trip fare plus both origin/destination transfers per traveler.
Stay is price per room per night × max(days − 1, 0) × rooms.
Local transport is per day, multiplied by travelers only for per-person pricing.
Food is daily per-person food × days × travelers.
Activity stop costs are per person and multiplied by travelers. Base transport, stay and ordinary meals are excluded from stop costs to avoid double counting.
Children are charged as adults; the app does not know child discounts. Rooms default to ceil(adults / 2); children may require a manual room override.
Optional contingency adds 10% to the subtotal. There is no currency conversion.
JPY uses the currency's normal zero-decimal format. Distances and prices are approximate AI estimates with no live availability or booking links.
Changing setup requires regenerating options. Prices are not live prices; verify before booking.
