# Cleanup log

Status: awaiting the explicit Stage 4 plan approval. No Stage 5 deletions have been performed.

The proposed removals are the unused BudgetSummary component and the unused COMFORTS/TRAVEL_MODES exports. Evidence and rejected removals are in REFACTOR_PLAN.md. The historical-document moves belong to Stage 1 and preserve their original blob contents.

Unused dependencies reported by depcheck are not automatically safe to remove. The reported @types packages support the blocking type check and are retained. The geocoder wrapper contains behavior, and NoLiveProvider remains a documented contract.
