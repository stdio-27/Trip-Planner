import { useEffect, useState } from "react";
import { retrySeconds, cooldownMessage } from "../../shared/retryAfter.js";
import { useCooldown } from "./useCooldown.js";

const cache = new Map();
const ttl = 10 * 60 * 1000;
export const clearSearchCache = () => cache.clear();
function cacheKey(url) {
  const parsed = new URL(url, "http://trip.local");
  if (parsed.searchParams.has("q")) parsed.searchParams.set("q",
    parsed.searchParams.get("q").trim().replace(/\s+/g, " ").toLowerCase());
  parsed.searchParams.sort();
  return parsed.pathname + parsed.search;
}
export function useDebouncedSearch(url, delay = 250) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const { retryAfter, beginCooldown, isCoolingDown } = useCooldown();
  useEffect(() => {
    if (!url) return;
    const key = cacheKey(url);
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) {
      setResult({ url, attempt, data: cached.data });
      return;
    }
    cache.delete(key);
    const controller = new AbortController();
    let current = true;
    const timer = setTimeout(async () => {
      if (isCoolingDown()) {
        if (current) setResult({ url, attempt, error: true });
        return;
      }
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          if (response.status === 429 && current) beginCooldown(retrySeconds(response));
          throw Error("Lookup failed");
        }
        const data = await response.json();
        if (current) {
          cache.set(key, { data, expires: Date.now() + ttl });
          if (cache.size > 500) cache.delete(cache.keys().next().value);
          setResult({ url, attempt, data });
        }
      } catch {
        if (current) setResult({ url, attempt, error: true });
      }
    }, delay);
    return () => {
      current = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [url, delay, attempt, beginCooldown, isCoolingDown]);
  const settled = result?.url === url && result.attempt === attempt;
  return {
    data: settled ? result.data : null,
    error: Boolean(settled && result.error),
    errorMessage: retryAfter ? cooldownMessage(retryAfter) : "Search is unavailable.",
    retryAfter,
    loading: Boolean(url && !settled),
    retry: () => { if (!isCoolingDown()) setAttempt((value) => value + 1); },
  };
}
