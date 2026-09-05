import type { FormEvent } from "react";

interface ShortenFormProps {
  longUrl: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}

export function ShortenForm({
  longUrl,
  onChange,
  onSubmit,
  submitting,
}: ShortenFormProps) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
      <input
        type="url"
        required
        placeholder="https://example.com/a-very-long-url-goes-here"
        value={longUrl}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 rounded-md border border-line bg-panel px-4 py-3 font-mono text-sm text-ink placeholder:text-muted focus:border-accent"
      />
      <button
        type="submit"
        disabled={submitting}
        className="shrink-0 rounded-md bg-accent px-5 py-3 text-sm font-medium text-accent-ink transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Shortening…" : "Shorten"}
      </button>
    </form>
  );
}
