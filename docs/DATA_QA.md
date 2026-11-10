# Phase 2 data quality report

| Measure | Source | Processed |
| --- | ---: | ---: |
| States/UTs | 36 | 36 |
| Districts | 790 | 790 |
| Stations | 8990 | 8696 |
| Train records | 5208 | Used for schedule cross-checks |
| Schedule rows | 417080 | Streamed; 2662 reference excluded/unknown stations |

106 scheduled-service airport directory entries, 449 major junctions, 131478 directed rail edges, 375 historical flight hints. The gzip graph is 1,502,798 bytes. Counts are computed from source rows, not fixed expectations.

293 stations had no coordinates and 1 had an explicit foreign label. 3870 state assignments were inferred within 50 km; 614 remain unassigned, including 64 major junctions. These are not silently allocated to a state.

| State / UT | Major junctions |
| --- | ---: |
| Andaman And Nicobar Islands | 0 |
| Andhra Pradesh | 23 |
| Arunachal Pradesh | 0 |
| Assam | 4 |
| Bihar | 17 |
| Chandigarh | 2 |
| Chhattisgarh | 3 |
| Delhi | 13 |
| Goa | 3 |
| Gujarat | 60 |
| Haryana | 5 |
| Himachal Pradesh | 3 |
| Jammu And Kashmir | 3 |
| Jharkhand | 7 |
| Karnataka | 7 |
| Kerala | 7 |
| Ladakh | 0 |
| Lakshadweep | 0 |
| Madhya Pradesh | 15 |
| Maharashtra | 67 |
| Manipur | 0 |
| Meghalaya | 0 |
| Mizoram | 1 |
| Nagaland | 3 |
| Odisha | 4 |
| Puducherry | 3 |
| Punjab | 8 |
| Rajasthan | 7 |
| Sikkim | 0 |
| Tamil Nadu | 10 |
| Telangana | 0 |
| The Dadra And Nagar Haveli And Daman And Diu | 0 |
| Tripura | 3 |
| Uttar Pradesh | 68 |
| Uttarakhand | 4 |
| West Bengal | 35 |
| Unassigned state | 64 |
| **Total** | **449** |

## Major junctions with no graph edges

- `BHRB` — Bhairabi (Mizoram)

Sample stations GHY, HWH, NDLS and SCL are present. GHY, HWH and NDLS are major; SCL is not selected. GAU, CCU, DEL and IXS are present in the airport data.

The zero counts in Arunachal Pradesh, Manipur, Meghalaya and Sikkim do not establish the absence of modern rail service. Review old state labels and the full list of unassigned junctions in `server/data/report.json` before adding journey UI.

## Verification

`npm run data:build` and `npm run data:check` passed on the fetched data. `npm test` passed 177 tests across 17 files; `npm run typecheck` and `npm run build` passed. An isolated demo server started from a temporary working directory in about 850 ms on this machine, returned a healthy status, three travel options and an exact two-day INR itinerary. No Gemini request was made. Other operating systems and current rail service were not verified.
