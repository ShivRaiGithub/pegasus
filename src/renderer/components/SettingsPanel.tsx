import { useEffect, useState } from 'react';
import { BRAND_NAME } from '../utils/brand';

interface SettingsPanelProps {
  isDark: boolean;
  onSavedApiKey: (key: string) => void;
  onClearedRecent: () => void;
  onToggleTheme: () => void;
}

function SettingsPanel({ isDark, onSavedApiKey, onClearedRecent, onToggleTheme }: SettingsPanelProps) {
  const [apiKey, setApiKey] = useState('');
  const [version, setVersion] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!window.electronAPI) return;
      const [key, appVersion] = await Promise.all([
        window.electronAPI.getApiKey(),
        window.electronAPI.getAppVersion(),
      ]);
      setApiKey(key);
      setVersion(appVersion);
    };

    load();
  }, []);

  const saveKey = async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.setApiKey(apiKey.trim());
    onSavedApiKey(apiKey.trim());
    setStatus('API key saved');
  };

  const clearRecent = async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.clearRecentFiles();
    onClearedRecent();
    setStatus('Recent files cleared');
  };

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-8">
        <p className="pegasus-section-label">General Settings</p>
        <h1 className="mt-2 text-[32px] font-bold text-textPrimary">API Configuration</h1>
        <p className="mt-1 text-sm text-textSecondary">
          {`Manage your ${BRAND_NAME} preferences and translation credentials`}
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-textPrimary">API Configuration</h2>
          <p className="mt-2 text-sm text-textSecondary">Configure your API key for document translation services</p>

          <div className="mt-6 space-y-3">
            <label className="block text-sm font-medium text-textPrimary">API Key</label>
            <div className="flex gap-2">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-textPrimary focus:border-accent focus:outline-none dark:bg-bg"
                placeholder="Enter your API key"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((value) => !value)}
                className="h-11 rounded-lg border border-border bg-white px-3 text-sm text-textPrimary dark:bg-bg"
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>

            <button
              type="button"
              onClick={saveKey}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accentHover"
            >
              Save API Key
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-textPrimary">Preferences</h3>

          <div className="mt-4 rounded-lg border border-border">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <div>
                <p className="text-sm font-medium text-textPrimary">Light Mode</p>
                <p className="text-xs text-textSecondary">Switch between light and dark themes</p>
              </div>
              <button
                type="button"
                onClick={onToggleTheme}
                className={`pegasus-switch ${isDark ? 'pegasus-switch-on' : ''}`}
                aria-label="Toggle theme"
              >
                <span className="pegasus-switch-handle" />
              </button>
            </div>

            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="text-sm font-medium text-textPrimary">App Version</p>
                <p className="text-xs text-textSecondary">{`Installed ${BRAND_NAME} build`}</p>
              </div>
              <p className="text-sm text-textSecondary">{version || '—'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-error/30 bg-error/5 p-6 shadow-sm">
          <p className="pegasus-section-label text-error">Danger Zone</p>
          <p className="mt-1 text-sm text-textSecondary">This action affects your local data.</p>

          <div className="mt-4 flex items-center justify-between rounded-lg border border-error/30 bg-surface px-4 py-3">
            <div>
              <p className="text-sm font-medium text-textPrimary">Clear recent files</p>
              <p className="text-xs text-textSecondary">This will remove all history of recently opened files.</p>
            </div>
            <button
              type="button"
              onClick={clearRecent}
              className="rounded-md border border-error/40 px-3 py-2 text-sm font-medium text-error transition hover:bg-error/10"
            >
              Clear Recent Files
            </button>
          </div>
        </div>

        {status ? <p className="text-sm text-success">{status}</p> : null}

        <div className="pt-2 text-xs text-textTertiary">
          <p>{`${BRAND_NAME} v1.0.0`}</p>
          <p className="mt-1">Powered by Lingo.dev</p>
        </div>
      </div>
    </section>
  );
}

export default SettingsPanel;
