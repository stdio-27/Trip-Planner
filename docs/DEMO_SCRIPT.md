# Demo script

Target duration is 3 minutes 45 seconds. This script describes a recording to make after the code is frozen. The recording itself is UNVERIFIED until the user makes it.

## Pre-recording checklist

- Use a clean browser profile and keep terminals containing credentials out of the recording.
- Use MOCK=demo without a key and confirm the Demo data badge.
- Check ports, load the bundled data, and verify the start command.
- Prepare the failure tabs below with the same trip already at the options step.
- Use a route you can personally explain. The example is New Delhi to Guwahati.
- Check the 390px viewport before recording and close unrelated pages.
- Fill the actual time-spent and AI-authorship placeholders before submission.

## Exact commands

In a separate PowerShell terminal for each desired tab, set the variables shown and run npm start. Each terminal must be in the repository root.

Main demo on ports 8787/5173:

```powershell
$env:MOCK="demo"
$env:PORT="8787"
$env:VITE_DEV_PORT="5173"
Remove-Item Env:MOCK_STAGE -ErrorAction SilentlyContinue
npm start
```

Malformed itinerary on ports 8791/5174:

```powershell
$env:MOCK="bad-json"
$env:MOCK_STAGE="plan"
$env:PORT="8791"
$env:VITE_DEV_PORT="5174"
npm start
```

Unavailable fares on ports 8792/5175:

```powershell
$env:MOCK="fares-fail"
$env:PORT="8792"
$env:VITE_DEV_PORT="5175"
npm start
```

Empty journeys on ports 8793/5176:

```powershell
$env:MOCK="journeys-empty"
$env:PORT="8793"
$env:VITE_DEV_PORT="5176"
npm start
```

Slow itinerary for cancellation on ports 8794/5177:

```powershell
$env:MOCK="slow"
$env:MOCK_STAGE="plan"
$env:PORT="8794"
$env:VITE_DEV_PORT="5177"
npm start
```

These are separate terminals so each process retains its own environment. Stop the recording servers with Ctrl+C after recording.

## Timed narration

| Time | Action and suggested narration |
| --- | --- |
| 00:00–00:15 | Show the demo badge. “This is the keyless demo. Routes use snapshots, and displayed prices are illustrative.” |
| 00:15–00:55 | Select Delhi, New Delhi, then Guwahati from the list. Select origin airport/station and show arrival defaults. Choose three days and the departure preferences. |
| 00:55–01:25 | Explore options. Expand a journey and point out buffers, 2016 timetable or 2014 flight evidence, and the availability link. Change the fare tier and return toggle. |
| 01:25–01:50 | Choose a stay and food option. Edit one estimate. Show the total and per-leg budget changing without another itinerary request. |
| 01:50–02:30 | Build the itinerary. Expand a stop, remove it and undo. Drag one stop across days, then use the keyboard move controls. Explain that edited activities update the cost total. |
| 02:30–02:45 | Switch to the prepared bad-json tab. Build and show the bounded retry/error. |
| 02:45–03:00 | Switch to fares-fail. Show preserved routes, editable estimates and Estimate prices again. |
| 03:00–03:12 | Switch to journeys-empty. Show the reason and Change hubs preserving setup. |
| 03:12–03:27 | Switch to slow. Build, show loading, then Cancel. Explain that the previous usable itinerary stays available. |
| 03:27–03:45 | Show the main app at 390px. Scroll through a journey and cost panel. Close with “Verify current schedules and prices before booking.” |

The physical-phone check is separate from viewport emulation. Consult FINAL_CHECKLIST.md before recording or submitting.
