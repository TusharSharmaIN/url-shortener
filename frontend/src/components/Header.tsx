import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="7" fill="#3654FF" />
          <path
            d="M13.5 18.5L18.5 13.5"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M14.8 11.6L16.4 10c1.6-1.6 4.2-1.6 5.8 0s1.6 4.2 0 5.8l-1.6 1.6"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M17.2 20.4L15.6 22c-1.6 1.6-4.2 1.6-5.8 0s-1.6-4.2 0-5.8l1.6-1.6"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
        <span className="font-mono text-sm font-medium text-ink">shrtn</span>
      </div>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </header>
  );
}
