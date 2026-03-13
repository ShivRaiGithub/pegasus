import { useEffect, useMemo, useState } from 'react';

interface ConvertFlowProps {
  filePath: string;
  fileName: string;
  isDark: boolean;
  onComplete: (outputPath: string) => void;
  onCancel: () => void;
}

type LangStatus = 'waiting' | 'translating' | 'done' | 'error';

interface TranslationState {
  status: LangStatus;
  error?: string;
}

const languageOptions = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'de', name: 'German' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
];

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
    <section className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center gap-2 text-sm text-textSecondary">
        {[1, 2, 3].map((value) => (
          <div
            key={value}
            className={`rounded-full border px-3 py-1 ${step === value ? 'border-accent text-accent' : 'border-border'}`}
          >
            {value}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-xl font-semibold text-textPrimary">Convert {fileName}</h2>

        {step === 1 ? (
          <div className="mt-6">
            <button
              type="button"
              onClick={toggleAll}
              className="mb-4 rounded-md border border-border px-3 py-2 text-sm text-textPrimary"
            >
              {allSelected ? 'Clear All' : 'Select All'}
            </button>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {languageOptions.map((language) => (
                <label
                  key={language.code}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-bg px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={selectedLanguages.includes(language.code)}
                    onChange={() => toggleLanguage(language.code)}
                    className="accent-accent"
                  />
                  <span className="text-sm text-textPrimary">
                    {language.name} ({language.code})
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={selectedLanguages.length === 0}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm text-textSecondary">API key</label>
              <div className="flex gap-2">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-textPrimary"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((value) => !value)}
                  className="rounded-md border border-border px-3 py-2 text-sm text-textPrimary"
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-textSecondary">Instructions (optional)</label>
              <textarea
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                placeholder="e.g. Do not translate proper nouns, keep brand names in English"
                className="h-28 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-textPrimary"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-textSecondary">Output folder</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={outputDir}
                  placeholder="Choose folder"
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-textPrimary"
                />
                <button
                  type="button"
                  onClick={chooseFolder}
                  className="rounded-md border border-border px-3 py-2 text-sm text-textPrimary"
                >
                  Browse
                </button>
              </div>
            </div>

            {errorMessage ? <p className="text-sm text-error">{errorMessage}</p> : null}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-md border border-border px-4 py-2 text-sm text-textPrimary"
              >
                Back
              </button>
              <button
                type="button"
                onClick={startTranslation}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white"
              >
                Translate
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mt-6 space-y-4">
            {languageOptions
              .filter((language) => selectedLanguages.includes(language.code))
              .map((language) => {
                const entry = states[language.code];
                return (
                  <div
                    key={language.code}
                    className="flex items-center justify-between rounded-md border border-border bg-bg px-3 py-2"
                  >
                    <div>
                      <p className="text-sm text-textPrimary">{language.name}</p>
                      <p className="text-xs uppercase text-textSecondary">{language.code}</p>
                    </div>
                    <p
                      className={`text-sm ${
                        entry?.status === 'done'
                          ? 'text-success'
                          : entry?.status === 'error'
                            ? 'text-error'
                            : 'text-textSecondary'
                      }`}
                    >
                      {entry?.status ?? 'waiting'}
                    </p>
                  </div>
                );
              })}

            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-textSecondary">
                <span>Overall progress</span>
                <span>{overallProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded bg-bg">
                <div className="h-full bg-accent transition-all" style={{ width: `${overallProgress}%` }} />
              </div>
            </div>

            {errorMessage ? <p className="text-sm text-error">{errorMessage}</p> : null}

            {!isRunning && resultPath ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onComplete(resultPath)}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white"
                >
                  Open .pgs file
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-md border border-border px-4 py-2 text-sm text-textPrimary"
                >
                  Done
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default ConvertFlow;
