import { useState, useCallback } from "react";
import { shortenUrl, getStats, probeRedirect, ApiError } from "../lib/api";
import type { ShortenResponse } from "../types/api";

export type CacheState =
  | { status: "idle" }
  | { status: "hit" }
  | { status: "miss" };

export function useShortener() {
  const [longUrl, setLongUrl] = useState("");
  const [result, setResult] = useState<ShortenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [totalClicks, setTotalClicks] = useState<number | null>(null);
  const [cache, setCache] = useState<CacheState>({ status: "idle" });

  const submit = useCallback(async () => {
    if (!longUrl.trim()) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    setTotalClicks(null);
    setCache({ status: "idle" });

    try {
      const res = await shortenUrl(longUrl.trim());
      setResult(res);
      // A fresh short code is always a cache miss on its first hit — check silently.
      const { ms } = await probeRedirect(res.shortCode);
      setCache({ status: ms < 30 ? "hit" : "miss" });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not reach the API.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [longUrl]);

  const refreshStats = useCallback(async () => {
    if (!result) return;
    const stats = await getStats(result.shortCode);
    setTotalClicks(stats.totalClicks);
  }, [result]);

  return {
    longUrl,
    setLongUrl,
    result,
    error,
    submitting,
    submit,
    totalClicks,
    refreshStats,
    cache,
  };
}
