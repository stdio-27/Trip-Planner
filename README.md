# Trip Planner

A React itinerary planner powered by a small Express API and the Gemini
`gemini-2.0-flash` model. The client can be run with mock API response modes
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
npm run dev
```

Vite runs on `http://localhost:5173` and proxies `/api` requests to Express on
`http://localhost:8787`. To run either process by itself, use `npm run
dev:client` or `npm run dev:server`.

Build the client with `npm run build`. Run the unit tests with `npm test`; use
`npm run test:watch` while developing.

## Architecture

```text
React UI -> Vite /api proxy -> Express -> Gemini LLM
                                      <- JSON response
React hook -> Zod validation and normalization -> itinerary UI
```

- **React UI:** `src/App.jsx` coordinates the trip form, generation states, and
  itinerary presentation. `useGenerate` manages requests; `useItinerary` and
  `itineraryReducer` manage edits and undo.
- **Vite proxy:** `vite.config.js` forwards `/api` to the local Express server,
  so the browser uses a same-origin API URL.
- **Express:** `server/index.js` exposes `POST /api/plan`, builds the model
  request using `server/prompt.js`, and calls Gemini with a 25-second timeout.
  The server extracts the first `{` through the last `}` from the model text,
  which tolerates JSON wrapped in markdown fences.
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

## Known limitations

- The app has no user accounts, database, or server-side itinerary persistence;
  edited plans and packing checklist state live in the current browser session.
- Budget totals are estimates derived from each stop's `estCost`; they do not
  include costs omitted by the model.
- The client retries invalid successful response bodies once, but it does not
  automatically retry network failures or non-2xx API responses.
- The client does not have a request timeout. The server's Gemini request has
  a 25-second timeout, while the `slow` mock waits 40 seconds and does not
  enforce that timeout.
- Day tabs and stop controls are accessible, but drag-and-drop behavior can
  vary by browser and assistive technology; the keyboard reorder buttons are
  also available.
- The Vite proxy is for local development. Production deployments need an
  equivalent `/api` route to the Express service.

## AI usage note

AI assistance was used to help implement and document this project. Gemini
generates itinerary suggestions; its output can be inaccurate, incomplete, or
unsuitable for your situation. Verify opening hours, routes, accessibility,
visa and safety requirements, and all prices before relying on the plan.
Estimated costs are suggestions, not quotes or reservations. Do not send
sensitive personal information in trip details, and review generated code
before relying on it.

## Time spent

Placeholder: **[enter time spent]**
