import { useEffect, useState } from "react";

export function useDebouncedSearch(url, delay = 250) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    let current = true;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw Error("Lookup failed");
        const data = await response.json();
        if (current) setResult({ url, attempt, data });
      } catch {
        if (current) setResult({ url, attempt, error: true });
      }
    }, delay);
    return () => {
      current = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [url, delay, attempt]);
  const settled = result?.url === url && result.attempt === attempt;
  return {
    data: settled ? result.data : null,
    error: Boolean(settled && result.error),
    loading: Boolean(url && !settled),
    retry: () => setAttempt((value) => value + 1),
  };
}
