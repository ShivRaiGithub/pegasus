import { useEffect, useState } from 'react';

interface SettingsPanelProps {
  isDark: boolean;
  onClose: () => void;
  onSavedApiKey: (key: string) => void;
  onClearedRecent: () => void;
}

function SettingsPanel({ onClose, onSavedApiKey, onClearedRecent }: SettingsPanelProps) {
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
    <div className="fixed inset-0 z-50 bg-black/60">
      <div className="absolute right-0 top-0 h-full w-full max-w-md border-l border-border bg-surface p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-textPrimary">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-2 py-1 text-textPrimary"
          >
            Close
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-sm text-textSecondary">API key</label>
          <div className="flex gap-2">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-textPrimary"
              placeholder="Enter your Lingo.dev key"
            />
            <button
              type="button"
              onClick={() => setShowApiKey((value) => !value)}
              className="rounded-md border border-border px-3 py-2 text-sm text-textPrimary"
            >
              {showApiKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <button
            type="button"
            onClick={saveKey}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Save
          </button>
        </div>

        <div className="mt-8 rounded-md border border-border bg-bg p-4">
          <p className="text-sm text-textSecondary">App version</p>
          <p className="mt-1 text-textPrimary">{version || '—'}</p>
        </div>

        <button
          type="button"
          onClick={clearRecent}
          className="mt-6 rounded-md border border-border px-4 py-2 text-sm text-textPrimary hover:border-accent"
        >
          Clear recent files
        </button>

        {status ? <p className="mt-4 text-sm text-success">{status}</p> : null}
      </div>
    </div>
  );
}

export default SettingsPanel;
