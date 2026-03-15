import { appAsset } from '../utils/assets';

interface HomeScreenProps {
  onOpenFile: () => void;
  onOpenPgs: () => void;
  onOpenRecent: (filePath: string) => void;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  preloadError: string | null;
  recentFiles: string[];
  mode: 'home' | 'recent';
}

const languageLabelMap: Record<string, string> = {
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

function fileTypeLabel(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (ext === 'pgs') return 'PGS';
  if (ext === 'docx') return 'DOCX';
  if (ext === 'txt') return 'TXT';
  if (ext === 'pdf') return 'PDF';
  return 'FILE';
}

function fileName(filePath: string): string {
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1];
}

function badgeClass(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (ext === 'docx') return 'pegasus-badge-docx';
  if (ext === 'txt') return 'pegasus-badge-txt';
  if (ext === 'pdf') return 'pegasus-badge-pdf';
  if (ext === 'pgs') return 'pegasus-badge-pgs';
  return 'pegasus-badge-txt';
}

function prettyDate(value: string): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function HomeScreen({
  onOpenFile,
  onOpenPgs,
  onOpenRecent,
  selectedLanguage,
  onLanguageChange,
  preloadError,
  recentFiles,
  mode,
}: HomeScreenProps) {
  const showHomeHero = mode === 'home';
  const hasRecent = recentFiles.length > 0;
  const selectedHomeLanguage = selectedLanguage === 'original' ? 'en' : selectedLanguage;

  return (
    <main className="mx-auto w-full max-w-6xl px-8 py-10">
      {showHomeHero ? (
        <section className="mx-auto mt-8 flex w-full max-w-[520px] flex-col items-center rounded-xl border border-border bg-surface px-8 py-10 text-center shadow-sm">
          <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accentLight">
            <img src={appAsset('/pegasusIcon.svg')} alt="Pegasus icon" className="h-7 w-7" />
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-textPrimary">Pegasus</h1>
          <p className="mt-2 text-sm text-textSecondary">Your document&apos;s Language Passport</p>

          <div className="mt-5 w-full text-left">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-textTertiary">Language</label>
            <select
              value={selectedHomeLanguage}
              onChange={(event) => onLanguageChange(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-textPrimary dark:bg-bg"
            >
              {uiLanguageOptions.map((lang) => (
                <option key={lang} value={lang}>
                  {languageLabelMap[lang] ?? lang.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {preloadError ? (
            <div className="mt-5 w-full rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
              {preloadError}
            </div>
          ) : null}

          <div className="mt-7 w-full space-y-2">
            <button
              type="button"
              onClick={onOpenFile}
              className="w-full rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accentHover"
            >
              Open Document
            </button>
            <button
              type="button"
              onClick={onOpenPgs}
              className="w-full rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-medium text-textPrimary transition hover:bg-cardHover dark:bg-surface"
            >
              Open .pgs file
            </button>
          </div>

          <p className="mt-4 text-xs text-textTertiary">Supports DOCX, TXT, PDF, PPTX</p>
        </section>
      ) : null}

      <section className={`mx-auto w-full max-w-[760px] ${showHomeHero ? 'mt-8' : 'mt-4'}`}>
        <p className="pegasus-section-label mb-3">Recent Files</p>
        <div className="rounded-xl border border-border bg-surface">
          {!hasRecent ? <p className="px-4 py-8 text-center text-sm text-textSecondary">No recent files yet</p> : null}

          {recentFiles.map((filePath, index) => (
            <button
              key={filePath}
              type="button"
              onClick={() => onOpenRecent(filePath)}
              className={`flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-cardHover ${
                index < recentFiles.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className={`pegasus-file-badge ${badgeClass(filePath)}`}>{fileTypeLabel(filePath)}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-textPrimary">{fileName(filePath)}</p>
                  <p className="truncate text-xs text-textSecondary">{filePath}</p>
                </div>
              </div>
              <span className="text-xs text-textTertiary">{prettyDate(filePath)}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

export default HomeScreen;
