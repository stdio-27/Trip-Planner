# Stage 1 baseline and hygiene

Recorded on 11 November 2026 IST. The starting commit is `e72796e73a640e856d845e0a7973b69deef1b2a6`, tagged `v2-feature-complete`. Work is on `final/polish`. Evidence commands were `git status --short` (empty at entry), `git branch --show-current` (returned `final/polish` after branch creation), and `git rev-parse HEAD v2-feature-complete` before changes (both returned the starting hash).

## Architecture in eight lines

1. React and Vite provide trip setup, journey selection and itinerary screens. Evidence is `src/App.jsx:37` and `vite.config.js:4`.
2. App state coordinates form values, local options, journeys, fares and the selected trip. Evidence is `src/App.jsx:53`.
3. Shared Zod schemas validate trip details, geographic selections and journey timing fields. Evidence is `shared/schemas.js:1`, `shared/schemas.js:73` and `shared/schemas.js:87`.
4. The shared request hook handles cancellation, a deadline, retries and stale responses. Evidence is `src/hooks/useGenerate.js:11`.
5. Express validates and rate-limits API requests, calls providers and serves compressed production assets. Evidence is `server/app.js:27`, `server/app.js:35` and `server/app.js:182`.
6. Place search uses Open-Meteo, while districts and transport hubs come from cached bundled data. Evidence is `server/geo/provider.js:24`, `server/geo/routes.js:69` and `server/data/index.js:138`.
7. The journey engine builds routes from data, then Gemini estimates fares from computed leg facts. Evidence is `server/journeys/engine.js:225` and `server/journeys/fares.js:50`.
8. The server verifies the chosen journey for itinerary timing, while a reducer manages edits and undo. Evidence is `server/app.js:198`, `src/hooks/useItinerary.js:8` and `src/itineraryReducer.js:69`.

## Clean install and repeated checks

The initial checks ran sequentially after `npm ci`. No retry was needed for a failing test. Runtime output was Node `v24.22.0` and npm `11.19.1`. Local evidence is in `artifacts/stage1/commands.json` and the corresponding command logs.

| Command | Exit | Recorded result | Command wall time |
| --- | ---: | --- | ---: |
| `npm ci` | 0 | 260 packages installed, 261 audited | 30.676 s |
| `npm test`, run 1 | 0 | 20 files passed, 233 tests passed | 31.075 s |
| `npm test`, run 2 | 0 | 20 files passed, 233 tests passed | 31.847 s |
| `npm test`, run 3 | 0 | 20 files passed, 233 tests passed | 29.306 s |
| `npm run typecheck` | 0 | `tsc -p jsconfig.json` completed without diagnostics | 2.070 s |
| `npm run build` | 0 | Vite completed, with a separate place-picker chunk | 4.949 s |
| `npm audit --json` | 0 | All severity counts and total vulnerabilities were 0 | 3.674 s |

Each of the three test logs ends with `Test Files 20 passed (20)` and `Tests 233 passed (233)`. Flaky test names observed in these runs were **none**. Flakiness outside these three runs is **UNVERIFIED**.

The install log includes an npm install-scripts warning about esbuild. The build log includes two Zod comment-annotation warnings. Installation and build still exited 0. Evidence is `artifacts/stage1/clean-install.log` and `artifacts/stage1/build.log`.

## Five server startup measurements

All five runs used the same command, `node server/index.js`, from the repository root. The child environment set `PORT=8916`, `MOCK=demo` and an empty API-key variable. Each process was stopped before the next run. Timing began immediately before process spawn and ended at the listening message, after the eager data load in `server/index.js:4`. A subsequent health request checked readiness independently.

| Run | Spawn to listening | Spawn to successful health response | Health |
| --- | ---: | ---: | --- |
| 1 | 1,118.515 ms | 1,235.294 ms | 200, healthy |
| 2 | 914.707 ms | 942.307 ms | 200, healthy |
| 3 | 894.484 ms | 914.685 ms | 200, healthy |
| 4 | 864.523 ms | 886.203 ms | 200, healthy |
| 5 | 940.144 ms | 971.480 ms | 200, healthy |

The listening-time **minimum was 864.523 ms, median 914.707 ms and maximum 1,118.515 ms**. Evidence is the JSON output of `node artifacts/stage1/startup.mjs`, saved in `artifacts/stage1/startup.json`. The machine reported Windows `10.0.26300`, x64, and Node `v24.22.0`. OS filesystem caches were retained between runs.

The previous 1.19-second and 2.09-second observations are single measurements. The exact reason for their difference is **UNVERIFIED**. This table establishes a repeated measurement with one timing boundary and command. Cold-boot performance with cleared OS caches is **UNVERIFIED**.

## Hygiene inventory and proposals

The inventory preceded the moves below. Commands included `git ls-tree -r -l HEAD`, `git ls-files`, `git check-ignore`, and filesystem metadata collection. The local inventory snapshot is `artifacts/stage1/hygiene.json`.

### Tracked files above 1 MB

These were the only tracked files above both 1,000,000 bytes and 1 MiB in the starting tree.

| File | Bytes | Proposal |
| --- | ---: | --- |
| `server/data/junctionGraph.json.gz` | 1,502,798 | Retain the processed graph |
| `server/data/stations.json` | 1,569,247 | Retain the processed station snapshot |

Evidence is `git ls-tree -r -l v2-feature-complete`. The runtime reads these assets in `server/data/index.js:98`.

`git ls-files server/data` returned 12 tracked paths, comprising ten JSON/gzip assets and two JavaScript files. The ten assets are airports, districts, flightRoutes, junctionGraph, majorJunctions, provenance, report, stateAliases, states and stations. `git ls-files data/raw` returned no paths. `git check-ignore data/raw/stations.json` matched the raw-data directory rule. Processed station data did not match an ignore rule. Evidence is `artifacts/stage1/hygiene.json` and `artifacts/stage1/config-hygiene.json`.

### Stray or historical files

| Original path | Inventory | Proposal and decision |
| --- | --- | --- |
| `artifacts/` | Ignored, no tracked paths | Retain local QA evidence and clone snapshots during this stage. Consider deleting disposable snapshots after review. |
| `AUDIT_REPORT.md` | Tracked, 27,044 bytes | Move to `docs/history/AUDIT_REPORT.md`, preserving the historical text. Applied. |
| `FIX_NOTES.md` | Tracked, 5,577 bytes | Move to `docs/history/FIX_NOTES.md`, preserving the historical text. Applied. |
| `Prohject_doc.pdf` | Tracked, 388,182 bytes | Retain for now. A later move to `docs/reference/` can preserve its name once its role is established. Content provenance and licensing are **UNVERIFIED**. |
| `VERIFICATION.md` | Tracked, 6,455 bytes | Retain as the existing verification record. The current stage is documented here. |
| `CHANGE_NOTES.md` | Tracked | Retain as the requested interview explanation log. |
| Logs | `git ls-files '*.log'` returned no paths | Keep verification logs local and ignore future log output. |

Only one tracked PDF was found by `git ls-files '*.pdf'`. The audit and fix notes were the historical root notes identified in this inventory. All inventoried stray files and data assets were retained or moved.

### Safe fixes listed before application

| Fix | Status | Commit |
| --- | --- | --- |
| Ignore logs, coverage output, TypeScript build caches and OS metadata | Applied | `95e297e` |
| Explain every application environment variable in the example file | Applied | `b2958ad` |
| Archive the historical audit report | Applied, unchanged contents | `1a23ce3` |
| Archive the historical fix notes | Applied, unchanged contents | `d81cb2b` |

Both moved files retain their original blob IDs. The audit is `65a7123a0ae4d4aa97e9124f62dc2786dd9de4fd` and the fix notes are `a0de896cabfe8c1d5325eadf7fef9e42086f6a2f`. Evidence is `git rev-parse v2-feature-complete:OLD_PATH` compared with `git hash-object NEW_PATH`, recorded in `artifacts/stage1/archive-content.json`.

Before moving the documents, a repository Markdown search for the old document names returned no references. External bookmarks or links to their former root paths are **UNVERIFIED**.

### Ignore rules and environment parity

The existing rules covered dependencies, production assets, local environment files, raw inputs and artifacts. The additions cover `*.log`, `coverage/`, `*.tsbuildinfo`, `.DS_Store` and `Thumbs.db`. Evidence is `.gitignore:1` and `.gitignore:13`.

Explicit `git check-ignore --no-index -q` checks found the following ignored: local `.env` variants, raw data, artifacts, dist, dependencies, logs, coverage, build caches and OS metadata. The checks found `.env.example` and `server/data/stations.json` available for tracking. The Boolean results are in `artifacts/stage1/config-hygiene.json`.

| Application variable | Code reading it | Example coverage |
| --- | --- | --- |
| `GEMINI_API_KEY` | `server/app.js:177`, `server/app.js:220` | Empty assignment and backend-only explanation |
| `GEMINI_MODEL` | `server/app.js:32` | Default model and purpose |
| `PORT` | `server/index.js:6`, `vite.config.js:12` | API port and proxy-target explanation |
| `VITE_DEV_PORT` | `vite.config.js:9` | Requested frontend port and occupied-port behavior |
| `MOCK` | `server/app.js:30` | Demo example, live default and mock choices |
| `MOCK_STAGE` | `server/app.js:31` | Optional itinerary-stage isolation |

A source scan of application and build-script JavaScript found these six names and no example omissions. Active example assignments were compared with the tagged version and were identical. Only comments changed. Evidence is `artifacts/stage1/config-hygiene.json`, `.env.example`, and `git diff v2-feature-complete -- .env.example`. Dependency-owned and operating-system environment variables are outside this application-variable inventory.

## Secret-pattern review

The scan matched literal Google API-key prefixes, Gemini key assignments and PEM private-key headers. It recorded paths, object IDs, line numbers and classifications, with no matched values in its output. The scanner command was `python artifacts/stage1/scan-secrets.py`.

The working-tree pass read 29,867 files and 471,846,183 bytes with zero read errors. It included ignored dependencies, artifacts and raw inputs. Git administrative directories were excluded from this filesystem walk. The history pass used `git cat-file --batch-all-objects --batch-check` followed by `git cat-file --batch` to inspect all 312 stored blobs, commits and tags, including unreachable objects. Reachable history paths were associated using `git rev-list --objects --all --reflog`. Evidence is `artifacts/stage1/secrets-baseline.json`.

| Scope | Recorded matches | Review |
| --- | --- | --- |
| Working tree | One non-empty local assignment, five empty/template assignments, three scan markers and twelve private-key headers | The non-empty assignment is in ignored `.env:1`. Its validity is **UNVERIFIED**. No complete Google-key-shaped token was found. |
| Dependency documentation | Twelve private-key headers across six English/Spanish dotenv README copies | All complete blocks contained placeholder ellipses. No real private-key body was established. Evidence is `artifacts/stage1/private-marker-review.json`. |
| Git object history | Twenty matching objects, comprising eighteen empty/template assignments and two scan markers | No non-placeholder assignment, complete Google-key-shaped token or private-key header was found in stored history. |

This establishes the result for the requested literal patterns in local file bytes and stored Git objects. Other secret formats, decoded compressed content, remote-only history and credential validity are **UNVERIFIED**. The populated local environment file was retained and remained ignored.

A follow-up scan after the four hygiene commits read 29,908 working files and all 318 then-stored blobs, commits and tags with zero read errors. It found the same working-tree classifications, and nineteen empty/template assignments plus two scan markers in history. It found no additional credential candidate. Evidence is the final output of `python artifacts/stage1/scan-secrets.py`, saved in `artifacts/stage1/secrets.json`.

## Fresh-clone demo test

The tagged repository was cloned with `git clone --no-hardlinks --branch v2-feature-complete . TEMP_DIRECTORY` into a new OS temporary directory. The example environment was copied to `.env`, and its API-key assignment was verified empty. `npm install` exited 0 with zero reported vulnerabilities. Evidence is `artifacts/stage1/clone.log` and `artifacts/stage1/fresh-install.log`.

The clone ran the repository's `npm start` with `MOCK=demo`, API port 8917 and Vite port 5198. Vite reported ready and Express reported listening. Both `http://localhost:8917/api/health` and `http://localhost:5198/api/health` returned HTTP 200 with `{"ok":true,"status":"healthy"}`. Evidence is `artifacts/stage1/fresh-start.log` and `artifacts/stage1/fresh-health.json`.

The browser used the fresh clone's actual frontend and API, with no provider substitutions. It selected Delhi / New Delhi, Guwahati, the DEL and NDLS origin hubs, generated options, displayed journey timing and fares, and built a three-day demo itinerary. Day 2 selection worked. Removing a stop and using Undo restored three stops. The final page had zero alerts and the title “A trip to Guwahati”. Evidence is the browser observation saved in `artifacts/stage1/fresh-flow.json` and the screenshot `artifacts/stage1/fresh-demo.jpg`.

No application failure was observed in this completed flow. Demo mode still uses Open-Meteo for place search, as shown by `server/geo/provider.js:24`; this was a keyless test with network access. The initial verification helper needed a correction so its empty-key check stayed on one line. A sandboxed shell health probe required a rerun with loopback access. Those were verification-tool issues.

The fresh-clone test process tree was stopped after the flow. The temporary clone and ignored local evidence were retained.

## Checks before hygiene commits

Every listed fix ran `npm test`, `npm run typecheck` and `npm run build` before its commit. Each check exited 0. Every test run passed 233 tests in 20 files. Evidence is the command output in the following local records.

| Fix | Check record |
| --- | --- |
| Ignore rules | `artifacts/stage1/ignore-checks.json` |
| Environment comments | `artifacts/stage1/env-checks.json` |
| Audit move | `artifacts/stage1/archive-audit-checks.json` |
| Notes move | `artifacts/stage1/archive-notes-checks.json` |
| Baseline report and five-line change note | `artifacts/stage1/baseline-report-checks.json` |

The baseline source and data remain identified by the tag. `git diff v2-feature-complete --name-status` shows the hygiene files, document moves, this report and the stage change-note entry. Local command logs and screenshots are ignored evidence retained in this workspace. Their key results are reproduced above for readers of the committed report.

## UNVERIFIED items

- Flakiness beyond the three consecutive baseline runs.
- The exact cause of the old timing discrepancy, and startup after clearing OS caches.
- Local credential validity, secret types outside the requested patterns, decoded archive contents and remote-only Git history.
- The PDF's provenance, licensing and intended role.
- External links or bookmarks to the two moved root documents.

## Five fragile parts of this stage

1. The `.env.example` exception must follow the broad environment ignore rule. Evidence is `.gitignore:3`.
2. The environment template can drift when code introduces a variable. The current six-name inventory is in the table above and `artifacts/stage1/config-hygiene.json`.
3. External links may still refer to the documents' old root paths. Only repository references were searched before the moves.
4. Secret scanning is limited by literal patterns and the locally available object store. The scan boundaries are stated above.
5. Startup measurements depend on the timing boundary and OS cache state. The five samples use the boundary recorded in `artifacts/stage1/startup.json`.

## Stage 7 final-structure comparison — 12 November 2026

Source commit: f4285c4 on final/polish. `npm ci` exited 0, then three sequential `npm test` runs each passed **271 tests in 28 files**, with no failing/flaky name observed in this sequence. Run wall times were 49.238, 47.233 and 44.509 seconds. `npm run typecheck`, `npm run build` and `npm audit --json` exited 0; audit reported zero vulnerabilities. Stage 1 had 233 tests in 20 files. Evidence: artifacts/master-pack/stage7-checks.json and stage7-{clean,test-1,test-2,test-3,types,build,audit}.log. Earlier test-wait flakiness is documented in QA_REPORT.md and was not erased.

| Measurement | Initial baseline | Final verification |
| --- | ---: | ---: |
| Tests / files | 233 / 20 | 271 / 28, three consecutive passes |
| Startup minimum, ms | 864.523 | 1,212.441 |
| Startup median, ms | 914.707 | 1,333.288 |
| Startup maximum, ms | 1,118.515 | 1,756.967 |
| Audit vulnerabilities | 0 | 0 |

The five final starts used the same `node server/index.js` command, PORT=8916, MOCK=demo, empty key, and spawn-to-listening boundary after eager data loading. All five health probes returned 200. OS caches were retained. The actual pre-refactor comparison median was 1,128.084 ms; final timing is slower in this sample. A concurrent-install sample was slower still (min 2,792.368 / median 3,818.608 / max 5,192.862 ms). Neither sample proves an intrinsic code regression or improvement. Evidence: startup-stage7.json, startup-stage7-contended.json and startup-before-refactor.json under artifacts/master-pack.

Final JS/CSS totals are 367,402 raw and 115,343 gzip bytes. Before 6a they were 366,106 / 114,620. The strict no-growth acceptance target is **NOT MET** (+0.35% raw); this is not presented as a performance improvement. REFACTOR_LOG.md contains every 6x boundary and zero-cycle results.

A new keyless local clone of f4285c4 installed successfully, copied only .env.example to .env, and ran `npm start` with MOCK=demo on ports 5199/8918. Health returned `{ok:true,mode:"demo"}`. Browser acceptance used real Open-Meteo selections (Delhi/New Delhi to Guwahati), changed fare tier/stay/food, showed INR 49,660.00, and generated three days. Expand, remove/undo, keyboard cross-day drag (Day 1:0, Day 2:2), reorder, packing add/check and phone widths passed. The deterministic golden fixture uses different coordinates and retains its unchanged INR 49,556.00 assertion. Evidence: clone.json, clone-install.log, fresh-start.log, fresh-flow.json, final-demo.jpg and final-phone.jpg in artifacts/master-pack.

The first clone used Windows' 8.3 temporary alias, which Vite rejected with HTTP 403. Repeating from the canonical full path fixed the verification environment without changing the app. The configured remote lacks final/polish (`git ls-remote --exit-code --heads origin refs/heads/final/polish`: exit 2); the remote clone attempt exited 128. Remote demo/live fresh-clone acceptance remains **UNVERIFIED** until the branch is pushed. A local fresh-clone live one-day request passed HTTP 200 using the existing key only in process memory (clone-live.log).
