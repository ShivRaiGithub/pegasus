import { useEffect, useMemo, useState } from 'react';

interface ConvertFlowProps {
  filePath: string;
  fileName: string;
  onComplete: (outputPath: string) => void;
  onCancel: () => void;
}

type LangStatus = 'waiting' | 'translating' | 'done' | 'error';

interface TranslationState {
  status: LangStatus;
  error?: string;
}

const languageOptions = [
  { code: 'en', name: 'English', label: 'EN-US', short: 'EN' },
  { code: 'fr', name: 'French', label: 'FR-FR', short: 'FR' },
  { code: 'es', name: 'Spanish', label: 'ES-ES', short: 'ES' },
  { code: 'de', name: 'German', label: 'DE-DE', short: 'DE' },
  { code: 'hi', name: 'Hindi', label: 'HI-IN', short: 'HI' },
  { code: 'ar', name: 'Arabic', label: 'AR-SA', short: 'AR' },
  { code: 'ja', name: 'Japanese', label: 'JA-JP', short: 'JA' },
  { code: 'zh', name: 'Chinese', label: 'ZH-CN', short: 'ZH' },
  { code: 'pt', name: 'Portuguese', label: 'PT-BR', short: 'PT' },
  { code: 'it', name: 'Italian', label: 'IT-IT', short: 'IT' },
];

const statusStyleMap: Record<LangStatus, string> = {
  waiting: 'bg-bg text-textSecondary',
  translating: 'bg-accentLight text-accent',
  done: 'bg-successLight text-success',
  error: 'bg-error/10 text-error',
};

function sanitizeUiLabel(value: string): string {
  return value.replace(/<[^>]+>/g, '').replace(/\s{2,}/g, ' ').trim();
}

function ConvertFlow({ filePath, fileName, onComplete, onCancel }: ConvertFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [outputDir, setOutputDir] = useState('');
  const [states, setStates] = useState<Record<string, TranslationState>>({});
  const [resultPath, setResultPath] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const loadApiKey = async () => {
      if (!window.electronAPI) return;
      const key = await window.electronAPI.getApiKey();
      setApiKey(key);
    };

    loadApiKey();
  }, []);

  const allSelected = selectedLanguages.length === languageOptions.length;

  const overallProgress = useMemo(() => {
    if (selectedLanguages.length === 0) return 0;
    const completed = selectedLanguages.filter((lang) => {
      const value = states[lang]?.status;
      return value === 'done' || value === 'error';
    }).length;
    return Math.round((completed / selectedLanguages.length) * 100);
  }, [selectedLanguages, states]);

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((item) => item !== lang) : [...prev, lang],
    );
  };

  const toggleAll = () => {
    setSelectedLanguages(allSelected ? [] : languageOptions.map((language) => language.code));
  };

  const chooseFolder = async () => {
    if (!window.electronAPI) return;
    const folder = await window.electronAPI.selectFolder();
    if (folder) {
      setOutputDir(folder);
    }
  };

  const startTranslation = async () => {
    if (!window.electronAPI) {
      setErrorMessage('Pegasus preload bridge is unavailable.');
      return;
    }

    if (!apiKey.trim()) {
      setErrorMessage('Please provide your API key in Step 2.');
      return;
    }

    if (!outputDir.trim()) {
      setErrorMessage('Please select an output folder.');
      return;
    }

    setErrorMessage(null);
    setResultPath(null);
    setStep(3);
    setIsRunning(true);

    const initialState: Record<string, TranslationState> = {};
    selectedLanguages.forEach((language) => {
      initialState[language] = { status: 'waiting' };
    });
    setStates(initialState);

    const unsubStatus = window.electronAPI.onTranslationStatus((event) => {
      if (!event.lang) {
        return;
      }
      setStates((current) => ({
        ...current,
        [event.lang as string]: { status: 'translating' },
      }));
    });

    const unsubComplete = window.electronAPI.onTranslationCompleteLang((event) => {
      setStates((current) => ({
        ...current,
        [event.lang]: { status: 'done' },
      }));
    });

    const unsubError = window.electronAPI.onTranslationErrorLang((event) => {
      setStates((current) => ({
        ...current,
        [event.lang]: { status: 'error', error: event.error },
      }));
    });

    const result = await window.electronAPI.convertToPgs({
      filePath,
      languages: selectedLanguages,
      apiKey,
      instructions,
      outputDir,
    });

    unsubStatus();
    unsubComplete();
    unsubError();

    setIsRunning(false);

    if (result.success && result.outputPath) {
      setResultPath(result.outputPath);
    } else {
      setErrorMessage(result.error ?? 'Conversion failed.');
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl px-8 py-8">
      <div className="mb-5 rounded-lg border border-border bg-surface px-4 py-3">
        <h1 className="text-2xl font-semibold text-textPrimary">New Conversion Project</h1>
      </div>

      <div className="mb-5 flex items-center gap-5 rounded-lg border border-border bg-surface px-4 py-3">
        {[1, 2, 3].map((value) => {
          const isActive = step === value;
          const isDone = step > value;

          return (
            <div key={value} className="flex items-center gap-3 text-sm">
              <div
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  isDone ? 'bg-success text-white' : isActive ? 'bg-accent text-white' : 'border border-border text-textTertiary'
                }`}
              >
                {isDone ? '✓' : value}
              </div>
              <span className={`${isActive ? 'text-accent' : 'text-textSecondary'} font-medium`}>
                {sanitizeUiLabel(value === 1 ? 'Languages' : value === 2 ? 'Settings' : 'Progress')}
              </span>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-2xl font-semibold text-textPrimary">
            {sanitizeUiLabel(step === 1 ? 'Select Languages' : step === 2 ? 'Configuration' : 'Translating your document...')}
          </h2>
          <p className="mt-1 text-sm text-textSecondary">{fileName}</p>
        </div>

        {step === 1 ? (
          <div className="px-5 py-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-textSecondary">
                {sanitizeUiLabel('Choose which languages you want to include in the passport.')}
              </p>
              <button
                type="button"
                onClick={toggleAll}
                className="text-sm font-medium text-accent hover:underline"
              >
                {sanitizeUiLabel(allSelected ? 'Clear All' : 'Select All')}
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {languageOptions.map((language) => (
                <label
                  key={language.code}
                  className={`cursor-pointer rounded-lg border px-3 py-3 transition ${
                    selectedLanguages.includes(language.code)
                      ? 'border-accent bg-accentLight/40'
                      : 'border-border bg-white hover:bg-cardHover dark:bg-bg'
                  }`}
                >
                  <input type="checkbox" checked={selectedLanguages.includes(language.code)} onChange={() => toggleLanguage(language.code)} className="sr-only" />
                  <div className="flex items-center justify-between">
                    <span className="inline-flex rounded-md border border-border bg-bg px-2 py-0.5 text-[10px] font-semibold text-textSecondary">
                      {language.short}
                    </span>
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                        selectedLanguages.includes(language.code)
                          ? 'border-accent bg-accent text-white'
                          : 'border-border text-textTertiary'
                      }`}
                    >
                      ✓
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-textPrimary">{language.name}</p>
                  <p className="text-xs text-textSecondary">{language.label}</p>
                </label>
              ))}
            </div>

            <div className="mt-6 flex justify-end border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={selectedLanguages.length === 0}
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accentHover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sanitizeUiLabel('Next →')}
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5 px-5 py-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-textPrimary">{sanitizeUiLabel('API key')}</label>
              <div className="flex gap-2">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-textPrimary focus:border-accent focus:outline-none dark:bg-bg"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((value) => !value)}
                  className="h-11 rounded-lg border border-border bg-white px-3 text-sm text-textPrimary dark:bg-bg"
                >
                  {sanitizeUiLabel(showApiKey ? 'Hide' : 'Show')}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-textPrimary">
                {sanitizeUiLabel('Instructions (optional)')}
              </label>
              <textarea
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                placeholder={sanitizeUiLabel('e.g. Do not translate proper nouns, keep brand names in English')}
                className="h-28 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-textPrimary focus:border-accent focus:outline-none dark:bg-bg"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-textPrimary">{sanitizeUiLabel('Output folder')}</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={outputDir}
                  placeholder={sanitizeUiLabel('Choose folder')}
                  className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-textPrimary dark:bg-bg"
                />
                <button
                  type="button"
                  onClick={chooseFolder}
                  className="h-11 rounded-lg border border-border bg-white px-3 text-sm text-textPrimary dark:bg-bg"
                >
                  {sanitizeUiLabel('Browse')}
                </button>
              </div>
            </div>

            {errorMessage ? <p className="text-sm text-error">{errorMessage}</p> : null}

            <div className="flex items-center justify-between border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-textPrimary"
              >
                {sanitizeUiLabel('Back')}
              </button>
              <button
                type="button"
                onClick={startTranslation}
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accentHover"
              >
                {sanitizeUiLabel('Create Language Passport')}
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4 px-5 py-5">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm text-textSecondary">
                <span>{sanitizeUiLabel('Total completion')}</span>
                <span className="font-semibold text-accent">{overallProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-bg">
                <div className="h-full bg-accent transition-all" style={{ width: `${overallProgress}%` }} />
              </div>
            </div>

            {languageOptions
              .filter((language) => selectedLanguages.includes(language.code))
              .map((language) => {
                const entry = states[language.code];
                const status = entry?.status ?? 'waiting';
                return (
                  <div
                    key={language.code}
                    className="flex items-center justify-between rounded-lg border border-border bg-white px-4 py-3 dark:bg-bg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex rounded-md border border-border bg-bg px-2 py-0.5 text-[10px] font-semibold text-textSecondary">
                        {language.short}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-textPrimary">{language.name}</p>
                        <p className="text-xs text-textSecondary">{language.label}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusStyleMap[status]}`}>
                      {sanitizeUiLabel(status)}
                    </span>
                  </div>
                );
              })}

            {errorMessage ? <p className="text-sm text-error">{errorMessage}</p> : null}

            {!isRunning && resultPath ? (
              <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-4">
                <p className="text-sm font-medium text-success">
                  {sanitizeUiLabel('Language Passport created successfully.')}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onComplete(resultPath)}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
                  >
                    {sanitizeUiLabel('Open Passport')}
                  </button>
                  <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-textPrimary"
                  >
                    {sanitizeUiLabel('Done')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-center border-t border-border pt-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-sm text-textSecondary hover:text-textPrimary"
                >
                  {sanitizeUiLabel('Cancel operation')}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default ConvertFlow;
