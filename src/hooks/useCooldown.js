import { useCallback, useEffect, useRef, useState } from "react";
export function useCooldown() {
  const until = useRef(0);
  const [retryAfter, setRetryAfter] = useState(0);
  const beginCooldown = useCallback((seconds) => {
    until.current = Date.now() + seconds * 1000;
    setRetryAfter(seconds);
  }, []);
  const isCoolingDown = useCallback(() => until.current > Date.now(), []);
  useEffect(() => {
    if (!retryAfter) return;
    const timer = setInterval(() => {
      setRetryAfter(Math.max(0, Math.ceil((until.current - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [retryAfter > 0]);
  return { retryAfter, beginCooldown, isCoolingDown };
}
