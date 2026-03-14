interface FallbackModalProps {
  missingLanguage: string;
  availableLanguages: string[];
  onTranslateNow: () => void;
  onSelectLanguage: (lang: string) => void;
  onViewOriginal: () => void;
  isDark: boolean;
}

const languageNameMap: Record<string, string> = {
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

function FallbackModal({
  missingLanguage,
  availableLanguages,
  onTranslateNow,
  onSelectLanguage,
  onViewOriginal,
}: FallbackModalProps) {
  const name = languageNameMap[missingLanguage] ?? missingLanguage.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-surface p-6">
        <h3 className="text-xl font-semibold text-textPrimary">Not available in {name}</h3>
        <p className="mt-1 text-sm text-textSecondary">
          This .pgs file doesn&apos;t include a {name} translation yet.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-bg p-4">
            <div className="mb-2 text-accent">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
                <path d="M11 2a1 1 0 0 1 .93 1.37L9.55 9H14a1 1 0 0 1 .8 1.6l-6 8A1 1 0 0 1 7 18l2.38-5H6a1 1 0 0 1-.9-1.44l5-9A1 1 0 0 1 11 2Z" />
              </svg>
            </div>
            <h4 className="font-medium text-textPrimary">Translate now</h4>
            <p className="mt-1 text-sm text-textSecondary">
              Add {name} to this file (requires API key)
            </p>
            <button
              type="button"
              onClick={onTranslateNow}
              className="mt-3 w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white"
            >
              Translate now
            </button>
          </div>

          <div className="rounded-xl border border-border bg-bg p-4">
            <div className="mb-2 text-accent">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm7.93 9h-3.1a15.3 15.3 0 0 0-1.48-5A8.03 8.03 0 0 1 19.93 11ZM12 4c.94 0 2.38 2.06 2.9 7H9.1C9.62 6.06 11.06 4 12 4ZM8.65 6a15.3 15.3 0 0 0-1.48 5h-3.1A8.03 8.03 0 0 1 8.65 6ZM4.07 13h3.1a15.3 15.3 0 0 0 1.48 5A8.03 8.03 0 0 1 4.07 13ZM12 20c-.94 0-2.38-2.06-2.9-7h5.8c-.52 4.94-1.96 7-2.9 7Zm3.35-2a15.3 15.3 0 0 0 1.48-5h3.1a8.03 8.03 0 0 1-4.58 5Z" />
              </svg>
            </div>
            <h4 className="font-medium text-textPrimary">View in another language</h4>
            <p className="mt-1 text-sm text-textSecondary">Choose one of the available versions</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {availableLanguages.filter(l => l !== 'original').map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => onSelectLanguage(lang)}
                  className="rounded-md border border-border px-2 py-1 text-xs text-textPrimary hover:border-accent"
                >
                  {languageNameMap[lang] ?? lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-bg p-4">
            <div className="mb-2 text-accent">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
                <path d="M7 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9.5L13.5 3H7Zm6 1.5L17.5 9H13V4.5Z" />
              </svg>
            </div>
            <h4 className="font-medium text-textPrimary">View original</h4>
            <p className="mt-1 text-sm text-textSecondary">View the original untranslated document</p>
            <button
              type="button"
              onClick={onViewOriginal}
              className="mt-3 w-full rounded-md border border-border px-3 py-2 text-sm font-medium text-textPrimary hover:border-accent"
            >
              View original
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FallbackModal;
