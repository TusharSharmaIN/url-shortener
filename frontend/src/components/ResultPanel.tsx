import type { ShortenResponse } from "../types/api";
import type { CacheState } from "../hooks/useShortener";
import { API_BASE_URL } from "../lib/config";
import { CopyButton } from "./CopyButton";

interface ResultPanelProps {
  result: ShortenResponse;
  totalClicks: number | null;
  onRefreshStats: () => void;
  cache: CacheState;
}

export function ResultPanel({
  result,
  totalClicks,
  onRefreshStats,
  cache,
}: ResultPanelProps) {
  const displayUrl = `${API_BASE_URL}/${result.shortCode}`;

  return (
    <div className="mt-8 rounded-lg border border-line bg-panel p-6">
      <div className="flex items-center gap-2">
        <a
          href={displayUrl}
          target="_blank"
          rel="noreferrer"
          className="truncate font-mono text-lg font-medium text-accent hover:underline"
        >
          {displayUrl}
        </a>
        <CopyButton text={displayUrl} />
      </div>

      <div className="mt-1 flex items-center gap-2">
        <span className="truncate font-mono text-xs text-muted">
          → {result.longUrl}
        </span>
        <CopyButton text={result.longUrl} className="ml-auto" />
      </div>

      <div className="mt-6 flex items-center justify-between gap-6 border-t border-line pt-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">Cache</span>
          {cache.status === "idle" && (
            <span className="font-mono text-ink">—</span>
          )}
          {cache.status !== "idle" && (
            <span
              className={`font-mono ${cache.status === "hit" ? "text-success" : "text-warn"}`}
            >
              {cache.status}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="font-mono text-ink">
            {totalClicks === null
              ? "—"
              : `${totalClicks} click${totalClicks === 1 ? "" : "s"}`}
          </span>
          <button
            onClick={onRefreshStats}
            className="rounded-md border border-line px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent hover:text-accent"
          >
            Get clicks
          </button>
        </div>
      </div>
    </div>
  );
}
