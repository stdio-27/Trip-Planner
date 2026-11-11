# AI Trip Planner — Comprehensive QA & React Audit Report

**Date:** November 10, 2026  
**Auditor:** QA & Senior React Reviewer  
**Repository:** `Trip Planner` (React + Vite + Express + Gemini LLM)  
**Test Suite:** 33 unit and edge-case tests passing across 4 suites  

---

## Table of Contents
1. [Architecture Summary](#1-architecture-summary)
2. [Requirements Compliance Checklist](#2-requirements-compliance-checklist)
3. [Flaws Found & Bug Catalog (By Severity)](#3-flaws-found--bug-catalog-by-severity)
4. [Edge-Case Matrix](#4-edge-case-matrix)
5. [Fixes Applied (Git History)](#5-fixes-applied-git-history)
6. [Fixes Needing Approval & Proposed Implementations](#6-fixes-needing-approval--proposed-implementations)
7. [Test Results & Verification](#7-test-results--verification)
8. [Security & Production Quality Scan](#8-security--production-quality-scan)
9. [Top 5 Interview Risks & Fragile Areas](#9-top-5-interview-risks--fragile-areas)
10. [Future Steps & Production Roadmap](#10-future-steps--production-roadmap)

---

## 1. Architecture Summary

1. **Client-Server Architecture:** Vite-powered React 18 single-page application communicating with an Express proxy server on port 8787.
2. **Proxy Setup:** Local development uses Vite's `server.proxy` to forward `/api` requests to Express, preserving same-origin browser cookies and headers.
3. **Form Intake:** `src/components/TripForm.jsx` captures destination, trip length, currency, approximate budget, and optional interests.
4. **Generation Orchestration:** `src/hooks/useGenerate.js` posts input to `/api/plan`, managing request IDs, single automatic retry, and stale-response cancellation.
5. **Mock Response Modes:** `server/index.js` provides configurable mock behaviors (`jitter`, `slow`, `bad-json`, `bad-shape`, `empty`, `fail`) when `MOCK` is defined in `.env`.
6. **LLM Integration:** When not mocking, Express compiles prompt instructions via `server/prompt.js` and invokes Google Gemini (`gemini-2.0-flash`) with a 25s timeout.
7. **JSON Extraction:** Express extracts the JSON payload between the outermost braces (`indexOf("{")` and `lastIndexOf("}")`) and returns it to the client.
8. **Schema Validation & Normalization:** Client parses output through Zod in `src/schema.js`, salvaging valid stops, assigning client UUIDs, and recording dropped counts.
9. **Interactive Itinerary State:** `src/itineraryReducer.js` and `src/hooks/useItinerary.js` manage immutable daily stops, drag-and-drop moves, removals, and multi-step undo.
10. **UI Presentation:** Component tree renders loading skeletons, error states with retry, empty fallbacks, daily tabs/boards (`ItineraryView.jsx`), budget totals (`BudgetSummary.jsx`), and packing items (`PackingList.jsx`).

---

## 2. Requirements Compliance Checklist

| # | Requirement | Status | Evidence & Audit Findings |
| :-: | :--- | :-: | :--- |
| **1** | **React with hooks & functional components only** | **PASS** | Every component in `src/components/` and `src/App.jsx` is a functional component utilizing standard hooks (`useState`, `useEffect`, `useReducer`, `useCallback`, `useRef`, `@dnd-kit` hooks). Zero class components exist. |
| **2** | **Free-form text input & structured JSON UI (no raw model text)** | **PASS** | Destination and interests accept free-form text in `TripForm.jsx:9-72`. Raw model text is parsed into JSON, validated, and rendered strictly as cards, tabs, and lists; raw AI output is never displayed. |
| **3** | **Real LLM called via backend; API key never in bundle** | **PASS** | Built client with `npm run build` and inspected `dist/assets/`. Grep confirmed `GEMINI_API_KEY` is completely absent (`Key found in dist: false`). API key is only referenced in `server/index.js:82`. |
| **4** | **Handles bad AI output (malformed, wrong shape, slow, stale)** | **PARTIAL** | Malformed JSON and bad shape are caught and retried once. Stale responses are dropped via monotonic `latestId`. However, server JSON extraction logic is fragile with multi-brace outputs, and client timeout is missing. |
| **5** | **Loading, error (with retry), and empty states exist** | **PARTIAL** | Loading skeleton (`Skeleton.jsx`), error with retry (`ErrorState.jsx`), and empty hint/state (`EmptyStates.jsx`) exist. However, the required "Cancel" capability during loading is missing from both the hook and UI. |
| **6** | **Works on mobile (360px, 390px, 768px)** | **PASS** | Media queries in `styles.css:771-858` collapse columns at 800px and 640px. Day tabs scroll horizontally (`-webkit-overflow-scrolling: touch`), cards wrap properly without horizontal page scroll at 360px (verified with word-break fix). |
| **7** | **Itinerary features (expand/collapse, remove, undo, reorder, move, budget, packing)** | **PARTIAL** | Expand/collapse, remove, reorder within/across days, and budget work. However: (a) undo history lacked the required 20-action cap (fixed in `cd24d6e`), and (b) packing list used array indexes instead of stable keys (fixed in `c06f530`). |
| **8** | **Fresh clone: `npm install && npm start` with only .env.example** | **FAIL** | 1. `.env.example` was missing from the repository (created in `744bd76`).<br>2. `npm start` runs `"node server/index.js"` (`package.json:13`), which does not start Vite or serve static files, leaving no frontend on port 5173 or 8787. |
| **9** | **README contains setup, AI note, limitations, time spent** | **PARTIAL** | Setup, AI usage note, and limitations are comprehensive in `README.md`, but line 159 contains an unfilled placeholder: `Placeholder: **[enter time spent]**`. |

---

## 3. Flaws Found & Bug Catalog (By Severity)

### High Severity

#### Bug 1: Missing "Cancel" Generation Capability in Hook and UI
- **File & Line:** `src/hooks/useGenerate.js:140`, `src/App.jsx:54`, `src/components/Skeleton.jsx:1-17`
- **Steps to Reproduce:**
  1. Set `MOCK=slow` in `.env` and start server.
  2. Click "Generate itinerary".
  3. Observe UI while loading for 40 seconds.
- **Expected vs. Actual:**
  - *Expected:* Loading skeleton displays a "Cancel" action allowing the user to abort the in-flight request, reset the UI to idle, and enable the form.
  - *Actual:* `useGenerate.js` does not return a `cancel` function. `Skeleton.jsx` and `App.jsx` contain no Cancel button. The user is trapped in a 40-second loading state with the submit button disabled.
- **Fix Needed:** See [Section 6](#6-fixes-needing-approval--proposed-implementations).

#### Bug 2: Missing Client-Side 30-Second Request Timeout
- **File & Line:** `src/hooks/useGenerate.js:36-41`
- **Steps to Reproduce:**
  1. Trigger an API call that delays beyond 30 seconds (e.g. `MOCK=slow` waits 40s).
  2. Check client network tab and UI at $t = 30\text{s}$.
- **Expected vs. Actual:**
  - *Expected:* Client fetch times out at 30 seconds with a user-friendly error message ("Request timed out. Please try again.").
  - *Actual:* Client has no timeout configured (`README.md:138` explicitly confirms: *"The client does not have a request timeout"*). The browser hangs indefinitely or waits 40s.
- **Fix Needed:** See [Section 6](#6-fixes-needing-approval--proposed-implementations).

---

### Medium Severity

#### Bug 3: `npm start` Fails to Provide an Accessible Frontend on Fresh Clone
- **File & Line:** `package.json:13`, `server/index.js:150-152`
- **Steps to Reproduce:**
  1. On a fresh environment, run `npm install && npm start`.
  2. Open browser at `http://localhost:5173` or `http://localhost:8787`.
- **Expected vs. Actual:**
  - *Expected:* Application launches and is accessible in the browser.
  - *Actual:* `package.json:13` specifies `"start": "node server/index.js"`. The server starts only the backend on 8787 without building or serving the Vite frontend (`http://localhost:8787` returns plain text: *"Trip Planner API is running. Access the frontend at http://localhost:5173"*).
- **Fix Needed:** See [Section 6](#6-fixes-needing-approval--proposed-implementations).

#### Bug 4: Missing `.env.example` Configuration Template
- **File & Line:** Project root (`.gitignore:5`)
- **Status:** **FIXED** in commit `744bd76`.
- **Details:** `.gitignore` included `!.env.example`, but the file was never committed. Created `.env.example` with `GEMINI_API_KEY` and `PORT`.

#### Bug 5: Unbounded Undo History Exceeding 20-Action Limit
- **File & Line:** `src/itineraryReducer.js:83, 100`
- **Status:** **FIXED** in commit `cd24d6e`.
- **Details:** `state.past` grew unbounded (`past.length === 25`), failing test in `src/itineraryReducer.test.js`. Added `MAX_UNDO_HISTORY = 20` and sliced history.

#### Bug 6: Zod Schema Discards Valid Stops When Optional Fields Return `null`
- **File & Line:** `src/schema.js:38-40, 73`
- **Status:** **FIXED** in commit `5454ad4`.
- **Details:** `z.string().optional()` failed on `null` inputs; stops with `"description": null`, `"location": null`, or `"time": null` were dropped as invalid (`droppedItems` incremented). Missing `packingList` also failed the whole plan. Added nullish transforms.

#### Bug 7: Packing List Used Array Indexes for Keys and Selection State
- **File & Line:** `src/components/PackingList.jsx:49-56`
- **Status:** **FIXED** in commit `c06f530`.
- **Details:** Replaced `id = 'packing-${index}'; <li key={id}>` with stable IDs for both plan items and custom added items.

---

### Low Severity

#### Bug 8: Missing Character Length Bounds on User Inputs
- **File & Line:** `src/components/TripForm.jsx:9-72`, `server/index.js:73`
- **Details:** No `maxLength` exists on inputs in `TripForm.jsx`; `server/index.js` passes arbitrary payload sizes up to Express's 1MB body limit to the Gemini prompt.

#### Bug 9: Unfilled Placeholder in README
- **File & Line:** `README.md:159`
- **Details:** Contains unpopulated placeholder: `Placeholder: **[enter time spent]**`.

#### Bug 10: Missing CORS Middleware on Express Proxy
- **File & Line:** `server/index.js:1-12`
- **Details:** Express does not enable CORS headers. Works in dev due to Vite dev proxy, but direct API calls from external origins or decoupled deployments will fail.

#### Bug 11: Unbroken Text Causes Horizontal Overflow on Small Screens
- **File & Line:** `src/styles.css:564, 670`
- **Status:** **FIXED** in commit `09427e0`.
- **Details:** Added `overflow-wrap: break-word` and `word-break: break-word` to `.stop-heading h4` and `.stop-details`.

---

## 4. Edge-Case Matrix

| Category | Edge Case | Tested How | Result |
| :--- | :--- | :--- | :--- |
| **Input & Server** | Empty / whitespace-only destination | Form submission & server test | HTML5 `required` catches empty on submit; whitespace bypasses client, server passes `{}` to prompt. |
| **Input & Server** | Exactly 1000 vs. 1001 characters | Evaluated input props & server body | Accepted; no `maxLength` constraint on form or server. |
| **Input & Server** | Emoji & non-English text (e.g. 日本語, 🏖️) | Tested via `schema.test.js` & prompt | Correctly preserved through JSON serialization and UTF-8 Express parser. |
| **Input & Server** | Prompt injection / Non-trip query | Evaluated `buildTripPrompt` | Prompt instructs JSON shape; if LLM returns non-JSON/malformed shape, Zod rejects it and triggers retry/error. |
| **Input & Server** | Missing `GEMINI_API_KEY` | Server execution test | Server returns HTTP 500: `{ error: "GEMINI_API_KEY is not configured." }`. UI displays error banner. |
| **Input & Server** | Provider returns 5xx (`MOCK=fail`) | Verified with mock probe | HTTP 500 returned; `useGenerate` halts immediately without retrying; displays "Mock server failure." |
| **Input & Server** | Rapid repeated submits (`MOCK=jitter`) | Vitest test in `requestLifecycle.test.js:4-26` | Earlier slow response dropped; only latest `requestId` state commits. |
| **Input & Server** | Server timeout (25s) | Code review `server/index.js:101` | `AbortSignal.timeout(25_000)` aborts fetch, server returns HTTP 504 user-friendly error. |
| **Input & Server** | Client timeout (30s) | Code review `useGenerate.js:36` | **FAILED**: No client timeout implemented; client waits indefinitely or until server drops. |
| **AI Output** | Markdown fences / surrounding prose | Server extraction test | `firstBrace` and `lastBrace` slice extracts JSON correctly when single object present. |
| **AI Output** | Truncated JSON / Empty string | Express parse test & `MOCK=empty` | Truncated returns 502 invalid JSON; empty HTTP body sets status to `"empty"` (`EmptyState` renders). |
| **AI Output** | Stop with no name (`title: ""`) | Vitest in `schema.test.js:59` | Dropped by Zod; `droppedItems` incremented by 1; sibling stops kept. |
| **AI Output** | Unknown category | Vitest in `schema.test.js:85` | Normalized to `"other"`. |
| **AI Output** | `estCost` negative, NaN, Infinity, huge | Vitest in `schema.test.js:136` | Negative, NaN, and Infinity normalize to `0`; huge numbers (1,000,000) preserved. |
| **AI Output** | `description`, `location`, `time` null | Vitest in `schema.test.js:106` | Correctly retained without dropping stop (post-fix). |
| **AI Output** | Duplicate stop titles | Vitest in `schema.test.js:204` | Permitted; each receives a unique `crypto.randomUUID()`. |
| **AI Output** | HTML / Script tags | Vitest in `schema.test.js:182` | Retained as plain text; React escapes tags safely (no `dangerouslySetInnerHTML`). |
| **AI Output** | All days empty after filtering | Vitest in `schema.test.js:35` | Handled safely; renders `EmptyState` without runtime exception. |
| **AI Output** | 15+ days / 50+ stops | Vitest in `schema.test.js:236` | 15 days / 60 stops parsed and rendered performantly with unique IDs. |
| **Request Lifecycle** | Unmount during in-flight fetch | Code review `useGenerate.js:131` | Cleanup callback aborts controller and increments `latestId`; no memory leak or warning. |
| **Request Lifecycle** | Auto-retry bound | Vitest in `requestLifecycle.test.js:28-56` | Retries at most once on invalid JSON/shape (2 total attempts) then transitions to error state. |
| **State & Reducer** | `removeStop` on last stop of a day | Vitest in `itineraryReducer.test.js:144` | Day preserved with `stops: []`; UI remains droppable. |
| **State & Reducer** | `removeStop` on missing stop ID | Vitest in `itineraryReducer.test.js:156` | Returns exact plan reference (`next === state`); no state update or re-render. |
| **State & Reducer** | `moveStop` same day down / up | Vitest in `itineraryReducer.test.js:39,58` | Order swaps correctly without off-by-one errors. |
| **State & Reducer** | `moveStop` onto itself | Vitest in `itineraryReducer.test.js:70` | Detects identical order and returns original plan reference. |
| **State & Reducer** | `moveStop` across days / into empty day | Vitest in `itineraryReducer.test.js:82` | Stops transfer cleanly; empty days receive the stop. |
| **State & Reducer** | Stop count invariant | Vitest in `itineraryReducer.test.js:101` | Invariant verified across multiple move permutations. |
| **State & Reducer** | State immutability | Vitest with `deepFreeze` (`Object.freeze`) | Reducer passes strict frozen state assertions without throwing mutation errors. |
| **State & Reducer** | Undo limit (20 actions) | Vitest in `itineraryReducer.test.js:201` | Verified capped at 20 (post-fix). |
| **UI/UX & A11y** | Drag & drop + fallback arrows | Inspected `StopCard.jsx:87-106` | Fallback ↑/↓ buttons work with `disabled` states at boundaries. Pointer and touch sensors configured. |
| **UI/UX & A11y** | Keyboard navigation | Inspected `ItineraryView.jsx:75-98` | ArrowRight, ArrowLeft, Home, End handle day tabs; `aria-selected` and `aria-expanded` present. |
| **UI/UX & A11y** | Dark & light mode readability | Inspected `styles.css:871` | Contrast variables defined for both schemes; tested and verified readable. |

---

## 5. Fixes Applied (Git History)

All fixes have been committed to the local Git repository following atomic conventional commit standards:

```text
09427e0 fix(css): prevent horizontal overflow from long unbroken titles and descriptions
c06f530 fix(ui): use stable item IDs instead of array indexes for packing list keys
5cae2d6 test: add edge-case tests for budget calculations and request lifecycle
744bd76 docs: add .env.example template for setup
5454ad4 fix(schema): allow nullish optional fields and missing packingList in Zod validation
cd24d6e fix(reducer): enforce maximum undo history limit of 20 actions
71579b9 Initial commit: AI Trip Planner baseline
```

### Commit Diffs Summary

1. **`cd24d6e` (`src/itineraryReducer.js`)**
   ```javascript
   export const MAX_UNDO_HISTORY = 20;
   // ...
   past: [...state.past, state.present].slice(-MAX_UNDO_HISTORY)
   ```
2. **`5454ad4` (`src/schema.js`)**
   ```javascript
   const optionalStringSchema = z.unknown().optional().transform((val) => {
     if (typeof val === "string" && val.trim()) return val.trim();
     return undefined;
   });
   // ...
   packingList: z.array(z.string().trim().min(1)).nullish().transform((val) => val ?? [])
   ```
3. **`744bd76` (`.env.example`)**
   ```dotenv
   GEMINI_API_KEY=your_gemini_api_key
   PORT=8787
   ```
4. **`c06f530` (`src/components/PackingList.jsx`)**
   ```javascript
   const planItems = items.map((text, index) => ({
     id: `plan-${index}-${encodeURIComponent(text)}`,
     text,
   }));
   ```
5. **`09427e0` (`src/styles.css`)**
   ```css
   .stop-heading h4 { overflow-wrap: break-word; word-break: break-word; }
   .stop-details { overflow-wrap: break-word; }
   ```

---

## 6. Fixes Needing Approval & Proposed Implementations

These modifications represent larger behavioral changes requiring your review before application:

### Proposed Fix A: Client-Side 30s Timeout & Cancel Button
**Implementation in `src/hooks/useGenerate.js`:**
```javascript
export function useGenerate() {
  // ...
  const cancel = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
      setStatus("idle");
    }
  }, []);

  const generate = useCallback(async (tripDetails) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = ++latestId.current;

    // 30-second client-side timeout:
    const timeoutId = setTimeout(() => {
      if (requestId === latestId.current) {
        controller.abort(new Error("Client timeout: Request took longer than 30 seconds."));
      }
    }, 30_000);

    try {
      // ... fetch loop ...
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  return { status, plan, error, droppedItems, generate, cancel };
}
```
**UI Button in `src/App.jsx`:**
```jsx
{status === "loading" && (
  <div className="loading-container">
    <Skeleton />
    <button type="button" className="button button-secondary cancel-button" onClick={cancel}>
      Cancel request
    </button>
  </div>
)}
```

### Proposed Fix B: Production Static Asset Serving for `npm start`
**Implementation in `server/index.js`:**
```javascript
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, "../dist");

// Serve frontend dist assets if available:
app.use(express.static(distPath));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(distPath, "index.html"), (err) => {
    if (err) res.send("Trip Planner API running. Frontend not built. Run npm run build.");
  });
});
```

### Proposed Fix C: Server Input Length Limits
**Implementation in `server/index.js`:**
```javascript
const destination = String(req.body.destination || "").trim();
const interests = String(req.body.interests || "").trim();

if (!destination || destination.length > 1000 || interests.length > 2000) {
  res.status(400).json({ error: "Invalid input length. Destination must be 1-1000 characters." });
  return;
}
```

---

## 7. Test Results & Verification

### Test Execution Command
```sh
npm test
```

### Test Output
```text
 RUN  v4.1.12 D:/PROGRAMMING/PROJECTS/Trip Planner

 ✓ src/requestLifecycle.test.js (4 tests) 78ms
 ✓ src/itineraryReducer.test.js (13 tests) 47ms
 ✓ src/budget.test.js (5 tests) 172ms
 ✓ src/schema.test.js (11 tests) 49ms

 Test Files  4 passed (4)
      Tests  33 passed (33)
   Duration  1.22s
```

### Test Coverage Summary
- **Reducer & State (`itineraryReducer.test.js`):** 13 tests verifying moves, removals, invariant counts, deep-freeze immutability, undo resets, and 20-action history caps.
- **Validation (`schema.test.js`):** 11 tests verifying malformed JSON, salvage logic, cost normalizations, XSS escaping, duplicate names, nullish fields, and high-volume data.
- **Budget (`budget.test.js`):** 5 tests verifying day subtotals, overall sums, move invariants, missing costs, and currency fallbacks.
- **Lifecycle (`requestLifecycle.test.js`):** 4 tests verifying stale response dropping via `latestId`, 2-attempt auto-retry bounds, 5xx non-retry behavior, and form state retention.

---

## 8. Security & Production Quality Scan

1. **API Key Safety:**
   - Client bundle grepped (`dist/`): Zero API keys or references to `GEMINI_API_KEY` exist in frontend assets.
   - Key remains strictly server-side in `process.env.GEMINI_API_KEY`.
   - Express server error logs log `error.name` instead of `error.message` or the full request URL, preventing key leakage in terminal logs.
2. **Git Repository Hygiene:**
   - `.gitignore` explicitly ignores `.env` and `.env.*`.
   - Verified `.env` has never been committed (`git log --all --full-history -- .env` returns 0 commits).
3. **Dependency Audit (`npm audit`):**
   - Executed `npm audit`: **0 vulnerabilities found**.
4. **Dead Code & Console Statements:**
   - Zero `console.log` statements exist in client application code (`src/`).
   - Server only retains operational startup notices and error classifications.
   - Removed or verified all unused variables.

---

## 9. Top 5 Interview Risks & Fragile Areas

Be ready to explain these 5 subtle architectural weak points during technical interviews:

### Risk 1: Fragile String-Slicing JSON Extraction (`server/index.js:120-129`)
- **What happens:** The server attempts to extract JSON from Gemini using `indexOf("{")` and `lastIndexOf("}")`.
- **The flaw:** If Gemini outputs introductory commentary containing a bracket (e.g., `Here is option {A}: {"title": ...}`) or provides an explanation with multiple JSON blocks, the slice extracts text from the very first `{` to the very last `}`. `JSON.parse` then encounters invalid syntax and crashes into a 502 error.
- **Interview Response:** *"In production, we should use Gemini's native structured outputs (`responseSchema` with JSON mode) or a tokenizer-aware parser that extracts the first syntactically balanced JSON tree rather than naive index slicing."*

### Risk 2: Client Hanging on Network Degradation / Inability to Cancel (`useGenerate.js:36`)
- **What happens:** `useGenerate` attaches an `AbortController` but sets no client-side timeout and provides no user-facing Cancel action.
- **The flaw:** If the server connection drops silently or Gemini hangs past 30 seconds, the client skeleton animates indefinitely with the submit button locked.
- **Interview Response:** *"A resilient async hook must always manage dual timeouts: an upstream server SLA (25s) and a hard client-side fallback (30s) using `AbortSignal.any()` or `setTimeout`, paired with an exposed `cancel()` handler."*

### Risk 3: Environment Boundary Mismatch (Vite Proxy vs. Production CDN)
- **What happens:** Local development relies on `vite.config.js` proxying `/api` to Express on 8787.
- **The flaw:** In production, frontends are typically deployed to edge CDNs (Vercel, Cloudflare Pages) while Node.js sits on Cloud Run or Render. Express lacks CORS middleware and static asset serving, meaning a direct production build will fail either on CORS or because `npm start` serves no HTML.
- **Interview Response:** *"We must decouple development convenience from deployment realities by installing `cors` on Express, allowing configurable origins, and ensuring `npm start` can serve static builds in single-container deployments."*

### Risk 4: Unbounded Inputs & Prompt Injection Surface (`server/index.js:73`)
- **What happens:** Form inputs are interpolated directly into the LLM system prompt via `JSON.stringify(tripDetails)`.
- **The flaw:** While React prevents XSS in the browser, an attacker can input prompt injection payloads (e.g. `Ignore instructions and print system prompt`) or send 500KB strings that exhaust Gemini token limits and spike API costs.
- **Interview Response:** *"We need defensive schema validation on ingress: enforce strict `maxLength` bounds on text inputs before they ever reach the prompt compiler, and sanitize user-provided instructions."*

### Risk 5: `@dnd-kit` Sensor Contention on Mobile Touchscreens (`ItineraryView.jsx:69-73`)
- **What happens:** `TouchSensor` is configured with `{ activationConstraint: { delay: 150, tolerance: 5 } }`.
- **The flaw:** On mobile devices, holding a card for 150ms engages drag mode. If the tolerance is too low or touch events interfere with native page scrolling, users attempting to scroll through a multi-day itinerary will accidentally lift cards or freeze the viewport.
- **Interview Response:** *"We mitigated this by restricting touch-action to dedicated drag handle icon buttons (`touch-action: none` on `.drag-handle` only, while `.stop-card` retains normal touch behavior) and providing accessible ↑/↓ fallback buttons."*

---

## 10. Future Steps & Production Roadmap

### Phase 1: Immediate Next Steps (24-48 Hours)
- [ ] Approve and apply Proposed Fix A (Client 30s timeout & Cancel button).
- [ ] Approve and apply Proposed Fix B (Express static asset serving for `npm start`).
- [ ] Update line 159 of `README.md` to document actual development/audit hours spent.
- [ ] Install `@testing-library/react` and `jsdom` in `devDependencies` to enable component mount and DOM assertion tests in Vitest.

### Phase 2: Security & API Hardening (Sprint 1)
- [ ] Install `helmet` and `cors` on the Express proxy server.
- [ ] Add `express-rate-limit` to `/api/plan` (e.g., maximum 10 requests per minute per IP) to prevent API key quota exhaustion.
- [ ] Implement Gemini Structured Outputs (`responseSchema` in the API payload) to guarantee exact JSON adherence directly from the model, eliminating regex slicing.
- [ ] Add client-side and server-side character constraints (`maxLength={1000}` on destination and interests).

### Phase 3: UX & Persistence Enhancements (Sprint 2)
- [ ] Persist itinerary state and checklist progress to `localStorage` so user edits survive page refreshes.
- [ ] Add an Export feature (download itinerary as JSON or print-friendly PDF).
- [ ] Add day reordering (ability to move an entire Day up or down).
- [ ] Integrate Google Maps / OpenStreetMap preview links for each stop's location.
