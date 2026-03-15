import type { OpenFileState } from '../types/pgs';
import ThemeToggle from './ThemeToggle';

interface NavbarProps {
  openFile: OpenFileState | null;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  mode?: 'viewer' | 'convert';
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
  mode = 'viewer',
}: NavbarProps) {
  const languageOptions = openFile?.type === 'pgs'
    ? ['original', ...uiLanguageOptions]
    : uiLanguageOptions;

  const topLabel = mode === 'convert' ? 'Convert Document' : openFile?.fileName ?? '';

  return (
    <header className="border-b border-border bg-surface">
      <div className="flex h-[52px] items-center justify-between px-6">
        <div className="flex min-w-0 items-center">
          <span className="truncate font-mono text-[13px] text-textSecondary">{truncateFilename(topLabel)}</span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedLanguage}
            onChange={(event) => onLanguageChange(event.target.value)}
            className="h-8 rounded-md border border-border bg-white px-2 text-xs text-textPrimary dark:bg-surface"
          >
            {languageOptions.map((lang) => (
              <option key={lang} value={lang}>
                {languageLabelMap[lang] ?? lang.toUpperCase()}
              </option>
            ))}
          </select>

          <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  );
}

export default Navbar;
