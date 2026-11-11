import { inrReferenceRanges } from "./fareReferences.js";
const tiers = ["basic", "standard", "premium"];
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
export function flagFares(fares, legs, currency) {
  const usable = legs.filter((leg) => leg.distanceKm > 0 && fares[leg.id]);
  return Object.fromEntries(legs.map((leg) => {
    const fare = fares[leg.id];
    if (!fare) return [leg.id, fare];
    const flags = new Set();
    if (leg.distanceKm > 0) {
      const peers = usable.filter((peer) => peer.mode === leg.mode);
      for (const tier of tiers) {
        const rate = fare[tier] / leg.distanceKm;
        if (peers.length > 1) {
          const center = median(peers.map((peer) => fares[peer.id][tier] / peer.distanceKm));
          if (rate > center * 4) flags.add("unusually_high");
          if (rate < center * 0.25) flags.add("unusually_low");
        }
        if (currency === "INR") {
          const [low, high] = inrReferenceRanges[leg.mode];
          if (rate > high) flags.add("unusually_high");
          if (rate < low) flags.add("unusually_low");
        }
      }
    }
    return [leg.id, { ...fare, flags: [...flags] }];
  }));
}
