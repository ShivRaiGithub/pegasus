interface FallbackModalProps {
  missingLanguage: string;
  availableLanguages: string[];
  onTranslateNow: () => void;
  onSelectLanguage: (lang: string) => void;
  onViewOriginal: () => void;
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
  const alternateLanguages = availableLanguages;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-[460px] rounded-2xl border border-border bg-surface p-7 shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
        <div className="mb-4 flex justify-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-warningLight text-lg text-warning">
            ⚠
          </div>
        </div>

        <h3 className="text-center text-[34px] font-semibold leading-none text-textPrimary">Not available in {name}</h3>
        <p className="mt-2 text-center text-sm text-textSecondary">
          This .pgs file doesn&apos;t include a {name} translation yet.
        </p>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={onTranslateNow}
            className="w-full rounded-xl bg-accent px-4 py-4 text-left text-white transition hover:bg-accentHover"
          >
            <span className="flex items-center justify-between">
              <span className="text-sm font-semibold">Translate now</span>
              <span aria-hidden="true">›</span>
            </span>
          </button>

          <div className="rounded-xl border border-border bg-bg p-4">
            <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-textPrimary">
              <span className="text-base text-textSecondary">🌐</span>
              View in another language
            </div>
            <div className="flex flex-wrap gap-2">
              {alternateLanguages.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => onSelectLanguage(lang)}
                  className="rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-textSecondary transition hover:border-accent hover:text-accent dark:bg-surface"
                >
                  {languageNameMap[lang] ?? lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onViewOriginal}
            className="flex w-full items-center gap-2 rounded-xl border border-border bg-bg px-4 py-3 text-sm font-medium text-textPrimary transition hover:border-accent"
          >
            <span className="text-base text-textSecondary">📄</span>
            View original
          </button>
        </div>

        <button
          type="button"
          onClick={onViewOriginal}
          className="mt-5 w-full text-center text-sm text-textTertiary transition hover:text-textSecondary"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export default FallbackModal;
