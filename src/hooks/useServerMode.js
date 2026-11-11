import { useEffect, useState } from "react";
export function useServerMode() {
  const [mode, setMode] = useState("unknown");
  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    async function load() {
      try {
        const response = await fetch("/api/health", { signal: controller.signal });
        const body = await response.json();
        if (current && response.ok && body.ok && ["demo", "live"].includes(body.mode)) setMode(body.mode);
      } catch {
        // A mode lookup failure must not interrupt a trip already being edited.
      }
    }
    load();
    return () => { current = false; controller.abort(); };
  }, []);
  return mode;
}
