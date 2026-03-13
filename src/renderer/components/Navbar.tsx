import type { OpenFileState } from '../types/pgs';
import ThemeToggle from './ThemeToggle';

interface NavbarProps {
  openFile: OpenFileState | null;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onGoHome: () => void;
}

const languageLabelMap: Record<string, string> = {
  original: 'Original',
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  de: 'German',
  hi: 'Hindi',
  ar: 'Arabic',
  ja: 'Japanese',
  zh: 'Chinese',
  pt: 'Portuguese',
  it: 'Italian',
};

const uiLanguageOptions = ['en', 'fr', 'es', 'de', 'hi', 'ar', 'ja', 'zh', 'pt', 'it'];

function truncateFilename(name: string): string {
  if (name.length <= 40) {
    return name;
  }
  return `${name.slice(0, 37)}...`;
}

function Navbar({
  openFile,
  selectedLanguage,
  onLanguageChange,
  isDark,
  onToggleTheme,
  onOpenSettings,
  onGoHome,
}: NavbarProps) {
  const languageOptions = openFile?.type === 'pgs'
    ? ['original', ...uiLanguageOptions]
    : uiLanguageOptions;

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-border bg-bg/90 px-4 backdrop-blur">
      <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between gap-4">
        <button
          type="button"
          className="flex items-center gap-2 text-textPrimary"
          onClick={onGoHome}
          title="Go home"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-accent" fill="currentColor" aria-hidden="true">
            <path d="M12 3.5c-2.9 0-5.7 1.17-7.78 3.26a1 1 0 0 0 1.41 1.41A9 9 0 0 1 12 5.5a1 1 0 1 0 0-2Zm-8.22 7.26A10.98 10.98 0 0 0 1 18.5a1 1 0 1 0 2 0 9 9 0 0 1 2.28-6.02 1 1 0 1 0-1.5-1.72Zm7.72-1.26a6.5 6.5 0 0 0-6.5 6.5 1 1 0 1 0 2 0 4.5 4.5 0 1 1 9 0v3a2.5 2.5 0 1 0 2-2.45V16a6.5 6.5 0 0 0-6.5-6.5Zm6.5 11.5a.5.5 0 1 1 0 1 .5.5 0 0 1 0-1Z" />
          </svg>
          <span className="text-lg font-semibold">Pegasus</span>
        </button>

        <div className="min-w-0 flex-1 text-center text-sm text-textSecondary">
          {openFile ? <span>{truncateFilename(openFile.fileName)}</span> : null}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedLanguage}
            onChange={(event) => onLanguageChange(event.target.value)}
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-textPrimary"
          >
            {languageOptions.map((lang) => (
              <option key={lang} value={lang}>
                {languageLabelMap[lang] ?? lang.toUpperCase()}
              </option>
            ))}
          </select>

          <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />

          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-textPrimary transition hover:border-accent"
            aria-label="Open settings"
            title="Settings"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M11.09 2.65c.58-1.16 2.24-1.16 2.82 0l.36.73a1.6 1.6 0 0 0 2.03.78l.77-.3c1.22-.47 2.4.7 1.93 1.92l-.3.77a1.6 1.6 0 0 0 .79 2.04l.72.36c1.16.58 1.16 2.24 0 2.82l-.72.36a1.6 1.6 0 0 0-.79 2.03l.3.77c.47 1.22-.7 2.4-1.93 1.93l-.77-.3a1.6 1.6 0 0 0-2.03.79l-.36.72c-.58 1.16-2.24 1.16-2.82 0l-.36-.72a1.6 1.6 0 0 0-2.03-.79l-.77.3c-1.22.47-2.4-.7-1.92-1.93l.29-.77a1.6 1.6 0 0 0-.78-2.03l-.73-.36c-1.16-.58-1.16-2.24 0-2.82l.73-.36a1.6 1.6 0 0 0 .78-2.04l-.3-.77C4.53 4.56 5.71 3.4 6.93 3.86l.77.3a1.6 1.6 0 0 0 2.03-.78l.36-.73ZM12.5 9a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
