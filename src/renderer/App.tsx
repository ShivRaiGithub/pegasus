import { useEffect, useMemo, useState } from 'react';
import Navbar from './components/Navbar';
import HomeScreen from './components/HomeScreen';
import Viewer from './components/Viewer';
import ConvertFlow from './components/ConvertFlow';
import SettingsPanel from './components/SettingsPanel';
import type { AppScreen, OpenFileState } from './types/pgs';

function baseName(filePath: string): string {
  const chunks = filePath.split(/[\\/]/);
  return chunks[chunks.length - 1];
}

function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  const [openFile, setOpenFile] = useState<OpenFileState | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('original');
  const [selectedLanguageByPgsPath, setSelectedLanguageByPgsPath] = useState<Record<string, string>>({});
  const [isDark, setIsDark] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preloadError, setPreloadError] = useState<string | null>(null);

  useEffect(() => {
    const loadInitialState = async () => {
      if (!window.electronAPI) {
        setPreloadError('Pegasus preload bridge failed to load. Please restart the app.');
        return;
      }

      const [savedApiKey, theme, pendingOpenPath] = await Promise.all([
        window.electronAPI.getApiKey(),
        window.electronAPI.getTheme(),
        window.electronAPI.openPgsFilePath(),
      ]);

      setApiKey(savedApiKey);
      setIsDark(theme === 'dark');

      if (pendingOpenPath) {
        await openFromPath(pendingOpenPath);
      }
    };

    loadInitialState();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const openFromPath = async (filePath: string) => {
    if (!window.electronAPI) {
      setPreloadError('Pegasus preload bridge failed to load. Please restart the app.');
      return;
    }

    if (filePath.toLowerCase().endsWith('.pgs')) {
      const pgs = await window.electronAPI.readPgsFile(filePath);

      const rememberedLanguage = selectedLanguageByPgsPath[filePath];
      const nextLanguage =
        rememberedLanguage && pgs.availableLanguages.includes(rememberedLanguage)
          ? rememberedLanguage
          : 'original';

      setOpenFile({
        type: 'pgs',
        filePath,
        fileName: baseName(filePath),
        pgsData: pgs,
      });
      setSelectedLanguage(nextLanguage);
      setCurrentScreen('viewer');
      await window.electronAPI.addRecentFile(filePath);
      return;
    }

    const extracted = await window.electronAPI.readFile(filePath);
    setOpenFile({
      type: 'regular',
      filePath,
      fileName: baseName(filePath),
      extractedContent: extracted,
    });
    setSelectedLanguage('original');
    setCurrentScreen('viewer');
  };

  const handleOpenFile = async () => {
    if (!window.electronAPI) {
      setPreloadError('Pegasus preload bridge failed to load. Please restart the app.');
      return;
    }
    const filePath = await window.electronAPI.selectFile();
    if (!filePath) return;
    await openFromPath(filePath);
  };

  const handleOpenPgs = async () => {
    if (!window.electronAPI) {
      setPreloadError('Pegasus preload bridge failed to load. Please restart the app.');
      return;
    }
    const filePath = await window.electronAPI.selectPgsFile();
    if (!filePath) return;
    await openFromPath(filePath);
  };

  const toggleTheme = async () => {
    if (!window.electronAPI) {
      setPreloadError('Pegasus preload bridge failed to load. Please restart the app.');
      return;
    }
    const next = !isDark;
    setIsDark(next);
    await window.electronAPI.setTheme(next ? 'dark' : 'light');
  };

  const startConvertFlow = () => {
    setCurrentScreen('convert');
  };

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    if (openFile?.type === 'pgs') {
      setSelectedLanguageByPgsPath((current) => ({
        ...current,
        [openFile.filePath]: lang,
      }));
    }
  };

  const canConvert = useMemo(() => openFile?.type === 'regular', [openFile]);

  return (
    <div className="min-h-screen bg-bg text-textPrimary">
      <Navbar
        openFile={openFile}
        selectedLanguage={selectedLanguage}
        onLanguageChange={handleLanguageChange}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setSettingsOpen(true)}
        onGoHome={() => setCurrentScreen('home')}
      />

      {currentScreen === 'home' ? (
        <HomeScreen
          onOpenFile={handleOpenFile}
          onOpenPgs={handleOpenPgs}
          onOpenRecent={(filePath) => void openFromPath(filePath)}
          isDark={isDark}
          preloadError={preloadError}
        />
      ) : null}

      {currentScreen === 'viewer' && openFile ? (
        <Viewer
          openFile={openFile}
          selectedLanguage={selectedLanguage}
          isDark={isDark}
          onConvertToPgs={
            canConvert
              ? startConvertFlow
              : () => {
                  setPreloadError('Translate now from .pgs is available after opening the original source document.');
                }
          }
          onSelectLanguage={handleLanguageChange}
        />
      ) : null}

      {currentScreen === 'convert' && openFile?.type === 'regular' ? (
        <ConvertFlow
          filePath={openFile.filePath}
          fileName={openFile.fileName}
          isDark={isDark}
          onComplete={(outputPath) => void openFromPath(outputPath)}
          onCancel={() => setCurrentScreen('viewer')}
        />
      ) : null}

      {settingsOpen ? (
        <SettingsPanel
          isDark={isDark}
          onClose={() => setSettingsOpen(false)}
          onSavedApiKey={setApiKey}
        />
      ) : null}

      {preloadError && currentScreen !== 'home' ? (
        <div className="fixed bottom-4 left-1/2 z-50 w-[90%] max-w-xl -translate-x-1/2 rounded-md border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {preloadError}
        </div>
      ) : null}

      <span className="hidden">{apiKey.length > 0 ? 'api-key-loaded' : 'api-key-empty'}</span>
    </div>
  );
}

export default App;
