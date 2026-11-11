# Refactor log

Status: full plan approved by the user. The following per-stage measurements are the authoritative before/after results. The first table preserves the initial inventory.

| Metric | Pre-refactor measurement | After |
| --- | --- | --- |
| Tracked production JS/JSX files | 51 | Pending |
| Largest file | server/app.js, 475 lines | Pending |
| Longest function | createApp, 446 lines | Pending |
| Dependency cycles | 0 from madge | Pending |
| Main JS raw / gzip | 332,137 / 104,977 bytes | Pending |
| Picker JS raw / gzip | 8,703 / 3,301 bytes | Pending |
| CSS raw / gzip | 25,656 / 6,395 bytes | Pending |
| Stage 1 startup min / median / max | 864.523 / 914.707 / 1,118.515 ms | Pending |

Evidence is artifacts/master-pack/metrics-before.json, madge-before.json and docs/BASELINE.md. Startup will need a measurement at the actual pre/post-refactor boundary if the plan is approved. Stage 1 timings are a historical comparison, not a claim about the modified code.

Stage 6c's strategy-registry condition is not currently met by the engine's distance-based dispatch. No registry is proposed. The other structural changes were explicitly approved in this chat.

## 6a measured boundary

| Metric | Before | After |
| --- | ---: | ---: |
| Production JS/JSX files | 50 | 61 |
| Largest file, lines | 475 | 305 |
| Longest function, lines | 446 | 274 |
| Total JS/CSS asset bytes | 366106 | 367442 |
| Total JS/CSS gzip bytes | 114620 | 115276 |
| Dependency cycles | 0 | 0 |

After startup min / median / max was 929.831 / 1018.046 / 1294.292 ms. The original actual pre-refactor median was 1128.084 ms. These repeated process starts retain OS caches.

Evidence: artifacts/master-pack/metrics-stage5-after.json, metrics-6a.json, cycles-6a.json and startup-6a.json.

## 6b measured boundary

| Metric | Before | After |
| --- | ---: | ---: |
| Production JS/JSX files | 61 | 63 |
| Largest file, lines | 305 | 305 |
| Longest function, lines | 274 | 276 |
| Total JS/CSS asset bytes | 367442 | 367448 |
| Total JS/CSS gzip bytes | 115276 | 115244 |
| Dependency cycles | 0 | 0 |

After startup min / median / max was 929.631 / 985.867 / 1019.632 ms. The original actual pre-refactor median was 1128.084 ms. These repeated process starts retain OS caches.

Evidence: artifacts/master-pack/metrics-6a.json, metrics-6b.json, cycles-6b.json and startup-6b.json.

## 6c measured boundary

| Metric | Before | After |
| --- | ---: | ---: |
| Production JS/JSX files | 63 | 63 |
| Largest file, lines | 305 | 305 |
| Longest function, lines | 276 | 276 |
| Total JS/CSS asset bytes | 367448 | 367448 |
| Total JS/CSS gzip bytes | 115244 | 115244 |
| Dependency cycles | 0 | 0 |

After startup min / median / max was 1090.033 / 1124.264 / 1214.101 ms. The original actual pre-refactor median was 1128.084 ms. These repeated process starts retain OS caches.

Evidence: artifacts/master-pack/metrics-6b.json, metrics-6c.json, cycles-6c.json and startup-6c.json.

Stage 6c retains the existing engine: `server/journeys/engine.js` selects by distance and calls cohesive helpers, without a three-way branch by mode. A registry would add indirection without meeting the approved rule of three. `node artifacts/master-pack/compare-routes.mjs` confirmed byte-identical journey arrays for Guwahati–Kolkata (5), Delhi–Mumbai (1), Jaipur–Ajmer (3), Port Blair–Delhi (1), and Guwahati local (2). The engine tests and five cost snapshots were unchanged.
