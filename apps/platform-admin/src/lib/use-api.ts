"use client";

import * as React from "react";
import { apiGet, type ApiEnvelope } from "./api-client";

export interface UseApiResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

/** Fetches `path` on mount and whenever `deps` change; exposes a manual `refetch` for post-mutation refresh. */
export function useApiGet<T>(path: string | null, deps: React.DependencyList = []): UseApiResult<T> {
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiGet<T>(path).then((res: ApiEnvelope<T>) => {
      if (cancelled) return;
      if (res.ok && res.data !== undefined) {
        setData(res.data);
      } else {
        setError(res.error?.message ?? "Something went wrong");
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick, ...deps]);

  const refetch = React.useCallback(() => setTick((t) => t + 1), []);

  return { data, error, loading, refetch };
}
