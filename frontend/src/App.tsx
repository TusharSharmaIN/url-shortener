import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { ShortenForm } from "./components/ShortenForm";
import { ResultPanel } from "./components/ResultPanel";
import { ErrorMessage } from "./components/ErrorMessage";
import { useShortener } from "./hooks/useShortener";
import { useTheme } from "./hooks/useTheme";

export default function App() {
  const { theme, toggle } = useTheme();
  const {
    longUrl,
    setLongUrl,
    result,
    error,
    submitting,
    submit,
    totalClicks,
    refreshStats,
    cache,
  } = useShortener();

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-16 sm:px-10">
      <Header theme={theme} onToggleTheme={toggle} />
      <main className="mt-12 flex-1">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Paste a link. Watch the system behind it.
        </h1>
        <p className="mt-3 max-w-lg text-muted">
          A short URL is the easy part. This one shows its work: cache-aside
          reads and click analytics, live.
        </p>
        <div className="mt-8">
          <ShortenForm
            longUrl={longUrl}
            onChange={setLongUrl}
            onSubmit={submit}
            submitting={submitting}
          />
          {error && <ErrorMessage message={error} />}
        </div>
        {result && (
          <ResultPanel
            result={result}
            totalClicks={totalClicks}
            onRefreshStats={refreshStats}
            cache={cache}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
