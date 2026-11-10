# Phase 2 data sources

The build fetches published datasets into ignored `data/raw/`. The app reads only committed processed files in `server/data/` at startup. No runtime geocoder, live availability provider or paid service was added in this phase.

| Source | Inputs and license | Retrieval and limits |
| --- | --- | --- |
| [datameet/railways](https://github.com/datameet/railways) | `stations.json`, `trains.json`, `schedules.json`; README states **CC0** | Retrieved 11 November 2026 IST; pinned revision `e0c538a1e41ae5eace454d2818902e1065608e16`, 8 August 2016. Historical data. Coordinates, station labels and services may be missing or outdated. |
| [Local Government Directory](https://lgdirectory.gov.in/) via [ramSeraph report mirror](https://ramseraph.github.io/opendata/lgd/archives/) | Approved LGD state and district master lists, **GODL-India** for the data. Mirror repository code license: not stated here; no mirror code is incorporated. | Retrieved 11 November 2026 IST. Matching 10 November 2026 reports; GitHub release archive checksums verified. CSV state and district counts match the source exactly. |
| [OurAirports](https://ourairports.com/data/) | `airports.csv`, `regions.csv`; **public domain** | Retrieved 11 November 2026 IST. Scheduled-service flag is directory metadata, not proof of a flight on a date. Region names are joined to LGD codes. |
| [OpenFlights](https://openflights.org/data.php#license) | `airports.dat`, `routes.dat`; database **ODbL 1.0**, individual contents **DbCL 1.0** | Retrieved 11 November 2026 IST. Route snapshot ended June 2014. Filtered directional direct pairs are historical hints only. `server/data/flightRoutes.json` is distributed under ODbL 1.0 with attribution to OpenFlights; individual contents retain DbCL 1.0. |

Exact URLs, UTC retrieval timestamps, source dates where available, sizes and SHA-256 fingerprints are in `server/data/provenance.json`. The LGD archives are from the mirror's main `lgd-latest` release; the supplementary release had no assets. The published reports were downloaded directly; no CAPTCHA or undocumented endpoint was used.

Licenses: [CC0](https://creativecommons.org/publicdomain/zero/1.0/), [GODL-India](https://www.data.gov.in/government-open-data-license-india), [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/), [DbCL 1.0](https://opendatacommons.org/licenses/dbcl/1-0/).

## Station and graph processing

Datameet stations/trains are GeoJSON FeatureCollections; station coordinates are `[longitude, latitude]`, station identifiers are `properties.code`, and train identifiers are `properties.number`. Schedules are a flat JSON array with `station_code`, `train_number`, `arrival`, `departure`, `day` and `id`. The builder streams the array twice: first to count distinct halting trains, then to keep only selected junction stops. It skips null geometry, out-of-bounds coordinates, explicit foreign labels and duplicate codes, recording each exclusion.

State labels are normalized against LGD names and documented aliases. Unmatched labels use the nearest original labelled station within 50 km, marked with the source station and distance. The method is approximate near state/national borders and cannot repair obsolete 2016 state labels. Telangana is absent as a station state label; the snapshot labels some present-day Telangana stations Andhra Pradesh. Modern statewide rail coverage is **not** established by this output. Unassigned stations remain unassigned.

The national junction rule is train count ≥ T, or name contains JN/JUNCTION/CENTRAL/TERMINUS and train count ≥ T/2. The builder chooses integer T to get as close to 400 as possible, then adds the three busiest evidenced stations per labelled state/UT (or all if fewer). This avoids excluding a state's primary hub when suburban stop counts dominate nationally. This run selected T=179. A zero count means a coverage gap in this source, not that a state has no trains today.

Graph edges are directional and require a common scheduled train that visits A before B. The elapsed duration uses source day and times, adjusts a departure crossing midnight, rejects nonpositive/outlier durations, and takes the median across distinct trains. Distances are straight-line distances between station coordinates, not rail track distances. The gzip graph is under 3 MiB; the runtime expands it once. No edge implies current operation, seats, or fares.

See [DATA_QA.md](DATA_QA.md) for the measured counts and isolated junctions. Review the gaps before using the data to build regional route suggestions.
