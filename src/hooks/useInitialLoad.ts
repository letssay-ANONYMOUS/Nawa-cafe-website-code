import { useState, useEffect } from "react";

const HAS_LOADED_KEY = "nawa_initial_loaded";

/**
 * Returns `true` while the initial page-load overlay should show.
 * Only triggers once per browser session.
 * Swap the setTimeout with real data-fetching later.
 */
export function useInitialLoad(durationMs = 1000): boolean {
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem(HAS_LOADED_KEY);
  });

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      sessionStorage.setItem(HAS_LOADED_KEY, "1");
      setLoading(false);
    }, durationMs);
    return () => clearTimeout(timer);
  }, [loading, durationMs]);

  return loading;
}
