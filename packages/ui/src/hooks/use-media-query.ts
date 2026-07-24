"use client";

import { useEffect, useState } from "react";

/**
 * SSR-safe `window.matchMedia` subscription. Returns `false` on the server
 * and during the first client render to avoid hydration mismatches; the
 * real value settles in an effect immediately after mount.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, [query]);

  return matches;
}
