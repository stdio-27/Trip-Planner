// Rough warning thresholds in INR per km, applied to every tier.
// Proposed first in docs/FARE_REFERENCE_RANGES.md. These are broad engineering
// references, not researched market prices. Minimum fares can trigger warnings.
// Warnings preserve prices and never block a journey. Cab rates are per vehicle.
export const inrReferenceRanges = {
  train: [0.1, 20],
  flight: [1, 100],
  bus: [0.2, 30],
  cab: [3, 100],
};
