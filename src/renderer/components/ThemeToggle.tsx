interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-textPrimary transition hover:border-accent"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M21.75 15.5A9.75 9.75 0 1 1 8.5 2.25a8 8 0 1 0 13.25 13.25Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M12 4a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V5a1 1 0 0 1 1-1ZM12 17a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1ZM5 11a1 1 0 1 1 0 2H4a1 1 0 1 1 0-2h1ZM20 11a1 1 0 1 1 0 2h-1a1 1 0 1 1 0-2h1ZM6.222 6.222a1 1 0 0 1 1.414 0l.707.707A1 1 0 1 1 6.93 8.343l-.707-.707a1 1 0 0 1 0-1.414ZM17.07 17.07a1 1 0 0 1 1.414 0l.707.707a1 1 0 1 1-1.414 1.414l-.707-.707a1 1 0 0 1 0-1.414ZM8.343 17.07a1 1 0 0 1 0 1.414l-.707.707a1 1 0 1 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0ZM19.192 5.101a1 1 0 0 1 0 1.414l-.707.707a1 1 0 0 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0ZM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
        </svg>
      )}
    </button>
  );
}

export default ThemeToggle;
