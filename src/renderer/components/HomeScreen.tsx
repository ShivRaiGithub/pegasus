import { useEffect, useMemo, useState } from 'react';

interface HomeScreenProps {
  onOpenFile: () => void;
  onOpenPgs: () => void;
  onOpenRecent: (filePath: string) => void;
  isDark: boolean;
  preloadError: string | null;
}

function fileTypeLabel(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (ext === 'pgs') return 'PGS';
  if (ext === 'docx') return 'DOCX';
  if (ext === 'txt') return 'TXT';
  return 'FILE';
}

function fileName(filePath: string): string {
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1];
}

function HomeScreen({ onOpenFile, onOpenPgs, onOpenRecent, preloadError }: HomeScreenProps) {
  const [recentFiles, setRecentFiles] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    const loadRecent = async () => {
      if (!window.electronAPI) {
        return;
      }
      const files = await window.electronAPI.getRecentFiles();
      if (active) {
        setRecentFiles(files.slice(0, 10));
      }
    };

    loadRecent();

    return () => {
      active = false;
    };
  }, []);

  const hasRecent = useMemo(() => recentFiles.length > 0, [recentFiles]);

  return (
    <main className="mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-5xl flex-col items-center px-6 py-10">
      <section className="mt-8 flex w-full max-w-3xl flex-col items-center rounded-2xl border border-border bg-surface px-6 py-10 text-center">
        <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full border border-border bg-bg">
          <svg viewBox="0 0 24 24" className="h-12 w-12 text-accent" fill="currentColor" aria-hidden="true">
            <path d="M12 3.5c-2.9 0-5.7 1.17-7.78 3.26a1 1 0 0 0 1.41 1.41A9 9 0 0 1 12 5.5a1 1 0 1 0 0-2Zm-8.22 7.26A10.98 10.98 0 0 0 1 18.5a1 1 0 1 0 2 0 9 9 0 0 1 2.28-6.02 1 1 0 1 0-1.5-1.72Zm7.72-1.26a6.5 6.5 0 0 0-6.5 6.5 1 1 0 1 0 2 0 4.5 4.5 0 1 1 9 0v3a2.5 2.5 0 1 0 2-2.45V16a6.5 6.5 0 0 0-6.5-6.5Zm6.5 11.5a.5.5 0 1 1 0 1 .5.5 0 0 1 0-1Z" />
          </svg>
        </div>
        <h1 className="text-3xl font-semibold text-textPrimary">Pegasus</h1>
        <p className="mt-2 text-textSecondary">Your documents, every language</p>

        {preloadError ? (
          <div className="mt-5 w-full rounded-md border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
            {preloadError}
          </div>
        ) : null}

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onOpenFile}
            className="rounded-md bg-accent px-5 py-2.5 font-medium text-white transition hover:opacity-90"
          >
            Open Document
          </button>
          <button
            type="button"
            onClick={onOpenPgs}
            className="rounded-md border border-border bg-bg px-5 py-2.5 font-medium text-textPrimary transition hover:border-accent"
          >
            Open .pgs file
          </button>
        </div>
      </section>

      <section className="mt-8 w-full max-w-3xl rounded-2xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-textPrimary">Recent files</h2>
        {!hasRecent ? <p className="text-sm text-textSecondary">No recent files</p> : null}
        <div className="space-y-2">
          {recentFiles.map((filePath) => (
            <button
              key={filePath}
              type="button"
              onClick={() => onOpenRecent(filePath)}
              className="flex w-full items-center justify-between rounded-md border border-border bg-bg px-3 py-2 text-left transition hover:border-accent"
            >
              <span className="truncate text-sm text-textPrimary">{fileName(filePath)}</span>
              <span className="rounded bg-surface px-2 py-0.5 text-xs uppercase text-textSecondary">
                {fileTypeLabel(filePath)}
              </span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

export default HomeScreen;
