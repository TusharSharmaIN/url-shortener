interface ThemeToggleProps {
  theme: "light" | "dark";
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle theme"
      className="rounded-md border border-line px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-ink"
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
