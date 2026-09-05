export function Footer() {
  return (
    <footer className="mt-16 flex items-center justify-between border-t border-line pt-6 text-xs text-muted">
      <span>Base62 encoding · Redis cache-aside · Async click analytics</span>
      <a
        href="https://github.com"
        target="_blank"
        rel="noreferrer"
        className="hover:text-ink"
      >
        Source
      </a>
    </footer>
  );
}
