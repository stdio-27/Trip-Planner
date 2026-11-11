# Final checklist

The full Stage 4 refactor plan was explicitly approved and implemented on final/polish. The local release marker is v1.0-submission on the final documentation commit. No remote push was performed. See MASTER_REPORT.md for evidence and acceptance caveats.

## Completed locally

- [x] Approved cleanup and structural stages committed separately with passing test/typecheck/build gates.
- [x] Clean install, three consecutive 271-test runs, blocking typecheck, production build and zero-vulnerability audit.
- [x] Five final startup samples and each refactor boundary recorded.
- [x] Five route arrays byte-identical; original golden flow/contracts/cost snapshots preserved.
- [x] All 16 mock modes observed in the browser; six real Gemini cases eventually passed.
- [x] Keyless local fresh clone installed and completed the demo flow; its one-day live API request also passed.
- [x] Local docs links checked, requested secret patterns scanned without printing values, large data assets reviewed.

## Acceptance caveats

The structural refactor is 1,296 raw bytes (0.35%) above the pre-6a asset total, so the strict whole-refactor no-growth target is NOT MET. Final startup median was 1,333.288 ms versus 1,128.084 ms at the actual pre-refactor boundary; load-sensitive measurements do not establish a no-slowdown pass. Two public source pages could not be verified due network/service errors. Remote fresh-clone acceptance is UNVERIFIED because final/polish is absent remotely. These are explicit caveats to the local freeze.

## What you must still do

- [ ] Review the five sanity routes in QA_ROUTES.json using your route knowledge, especially north-east coverage.
- [ ] Review the rough INR warning ranges in FARE_REFERENCE_RANGES.md and actual fare plausibility.
- [ ] Test pickers, touch cross-day drag/drop, cost edits and accessibility on a physical phone.
- [ ] Fill your actual time spent in README.md.
- [ ] Confirm every AI tool used and the work you personally authored in README.md.
- [ ] Review the performance caveats and provider 503 history in BASELINE.md/LIVE_RUNS.md.
- [ ] Push the reviewed branch and local submission tag.
- [ ] Fresh-clone the pushed branch from GitHub into another folder or machine; run npm install and npm start in demo and live modes.
- [ ] Record the 3:45 demo using DEMO_SCRIPT.md after review.
- [ ] Practise the interview drills on a disposable copy.

## Manual release commands

```powershell
git show --no-patch v1.0-submission
git push -u origin final/polish
git push origin v1.0-submission
# In a different folder, clone the pushed final/polish branch and repeat setup.
```

The local tag does not certify a physical-phone test, current transport inventory, a remote release, personal authorship details, or that every performance acceptance target was met. No further feature work belongs in this freeze.
