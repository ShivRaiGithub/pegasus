import { useEffect, useMemo, useState } from 'react';
import { useLingoContext } from '@lingo.dev/compiler/react';
import Navbar from './components/Navbar';
import HomeScreen from './components/HomeScreen';
import Viewer from './components/Viewer';
import ConvertFlow from './components/ConvertFlow';
import SettingsPanel from './components/SettingsPanel';
import type { AppScreen, OpenFileState } from './types/pgs';
import { appAsset } from './utils/assets';
import { BRAND_NAME } from './utils/brand';

const uiLocales = ['en', 'fr', 'es', 'de', 'hi', 'ar', 'ja', 'zh', 'pt', 'it'] as const;
type UiLocale = (typeof uiLocales)[number];

function baseName(filePath: string): string {
  const chunks = filePath.split(/[\\/]/);
  return chunks[chunks.length - 1];
}

function App() {
  const { setLocale } = useLingoContext();
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  const [homeSection, setHomeSection] = useState<'home' | 'recent'>('home');
  const [openFile, setOpenFile] = useState<OpenFileState | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedLanguageByPgsPath, setSelectedLanguageByPgsPath] = useState<Record<string, string>>({});
  const [isDark, setIsDark] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [preloadError, setPreloadError] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);

  useEffect(() => {
    const loadInitialState = async () => {
      if (!window.electronAPI) {
        setPreloadError(`${BRAND_NAME} preload bridge failed to load. Please restart the app.`);
        return;
      }

      const [savedApiKey, theme, pendingOpenPath, savedRecent] = await Promise.all([
        window.electronAPI.getApiKey(),
        window.electronAPI.getTheme(),
        window.electronAPI.openPgsFilePath(),
        window.electronAPI.getRecentFiles(),
      ]);

      setApiKey(savedApiKey);
      setIsDark(theme === 'dark');
      setRecentFiles(savedRecent.slice(0, 10));

      if (pendingOpenPath) {
        await openFromPath(pendingOpenPath);
      }
    };

    loadInitialState();
  }, []);

  const refreshRecentFiles = async () => {
    if (!window.electronAPI) return;
    const files = await window.electronAPI.getRecentFiles();
    setRecentFiles(files.slice(0, 10));
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    const fallbackLocale: UiLocale = 'en';
    const candidateLocale = selectedLanguage === 'original' ? fallbackLocale : selectedLanguage;
    const uiLocale = (uiLocales as readonly string[]).includes(candidateLocale)
      ? (candidateLocale as UiLocale)
      : fallbackLocale;

    setLocale(uiLocale);
    document.documentElement.lang = uiLocale;
    document.documentElement.dir = 'ltr';
    document.documentElement.setAttribute('data-ui-locale', uiLocale);
  }, [selectedLanguage, setLocale]);

  const openFromPath = async (filePath: string) => {
    if (!window.electronAPI) {
      setPreloadError(`${BRAND_NAME} preload bridge failed to load. Please restart the app.`);
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
      await refreshRecentFiles();
      return;
    }

    const extracted = await window.electronAPI.readFile(filePath);
    setOpenFile({
      type: 'regular',
      filePath,
      fileName: baseName(filePath),
      extractedContent: extracted,
    });
    setCurrentScreen('viewer');
  };

  const handleOpenFile = async () => {
    if (!window.electronAPI) {
      setPreloadError(`${BRAND_NAME} preload bridge failed to load. Please restart the app.`);
      return;
    }
    const filePath = await window.electronAPI.selectFile();
    if (!filePath) return;
    await openFromPath(filePath);
  };

  const handleOpenPgs = async () => {
    if (!window.electronAPI) {
      setPreloadError(`${BRAND_NAME} preload bridge failed to load. Please restart the app.`);
      return;
    }
    const filePath = await window.electronAPI.selectPgsFile();
    if (!filePath) return;
    await openFromPath(filePath);
  };

  const toggleTheme = async () => {
    if (!window.electronAPI) {
      setPreloadError(`${BRAND_NAME} preload bridge failed to load. Please restart the app.`);
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

  const canConvert = useMemo(
    () => openFile?.type === 'regular' || openFile?.type === 'pgs',
    [openFile]
  );

  const activeSidebarItem = useMemo(() => {
    if (currentScreen === 'settings') return 'settings';
    if (currentScreen === 'home' && homeSection === 'recent') return 'recent';
    return 'home';
  }, [currentScreen, homeSection]);

  const goHome = () => {
    setCurrentScreen('home');
    setHomeSection('home');
  };

  const goRecent = () => {
    setCurrentScreen('home');
    setHomeSection('recent');
  };

  const goSettings = () => {
    setCurrentScreen('settings');
  };

  const openDocumentAndReset = async () => {
    setCurrentScreen('home');
    setHomeSection('home');
    await handleOpenFile();
  };

  const openPgsAndReset = async () => {
    setCurrentScreen('home');
    setHomeSection('home');
    await handleOpenPgs();
  };

  const sidebarLogo = isDark ? appAsset('/pegasusLogo-Dark.png') : appAsset('/pegasusLogo-Light.png');
  const sidebarIcon = appAsset('/pegasusIcon.svg');
  const lingoLogo = appAsset('/lingodev.png');

  return (
    <div className="min-h-screen bg-bg text-textPrimary">
      <div className="flex min-h-screen">
        <aside className="pegasus-sidebar w-[220px] border-r border-border bg-surface py-5">
          <div className="px-4 pb-3">
            <button type="button" onClick={goHome} className="flex w-full items-center gap-2 text-left">
              <img src={sidebarIcon} alt={`${BRAND_NAME} icon`} className="h-5 w-5" />
            </button>
          </div>

          <nav className="mt-2 space-y-0.5 px-2">
            <button
              type="button"
              onClick={goHome}
              className={`pegasus-nav-item ${activeSidebarItem === 'home' ? 'pegasus-nav-item-active' : ''}`}
            >
              <span className="inline-flex h-4 w-4 items-center justify-center">⌂</span>
              Home
            </button>
            <button
              type="button"
              onClick={goRecent}
              className={`pegasus-nav-item ${activeSidebarItem === 'recent' ? 'pegasus-nav-item-active' : ''}`}
            >
              <span className="inline-flex h-4 w-4 items-center justify-center">◷</span>
              Recent Files
            </button>
            <button
              type="button"
              onClick={goSettings}
              className={`pegasus-nav-item ${activeSidebarItem === 'settings' ? 'pegasus-nav-item-active' : ''}`}
            >
              <span className="inline-flex h-4 w-4 items-center justify-center">⚙</span>
              Settings
            </button>
          </nav>

          <div className="mt-auto flex flex-col items-center border-t border-border px-4 py-3 text-center">
            <img src={sidebarLogo} alt={BRAND_NAME} className="mb-3 h-20 w-auto" />
            <img src={lingoLogo} alt="Lingo.dev" className="mb-2 h-20 w-auto" />
            <div className="text-xs text-textTertiary">v1.0.0</div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {currentScreen === 'viewer' && openFile ? (
            <Navbar
              openFile={openFile}
              selectedLanguage={selectedLanguage}
              onLanguageChange={handleLanguageChange}
              isDark={isDark}
              onToggleTheme={toggleTheme}
            />
          ) : null}

          {currentScreen === 'convert' && openFile ? (
            <Navbar
              openFile={openFile}
              selectedLanguage={selectedLanguage}
              onLanguageChange={handleLanguageChange}
              isDark={isDark}
              onToggleTheme={toggleTheme}
              mode="convert"
            />
          ) : null}

          <div className="flex-1">
            {currentScreen === 'home' ? (
              <HomeScreen
                recentFiles={recentFiles}
                onOpenFile={() => void openDocumentAndReset()}
                onOpenPgs={() => void openPgsAndReset()}
                onOpenRecent={(filePath) => void openFromPath(filePath)}
                selectedLanguage={selectedLanguage}
                onLanguageChange={handleLanguageChange}
                isDark={isDark}
                preloadError={preloadError}
                mode={homeSection}
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

            {currentScreen === 'convert' && (openFile?.type === 'regular' || openFile?.type === 'pgs') ? (
              <ConvertFlow
                filePath={openFile.filePath}
                fileName={openFile.fileName}
                onComplete={(outputPath) => void openFromPath(outputPath)}
                onCancel={() => setCurrentScreen('viewer')}
              />
            ) : null}

            {currentScreen === 'settings' ? (
              <SettingsPanel
                isDark={isDark}
                onSavedApiKey={setApiKey}
                onClearedRecent={() => void refreshRecentFiles()}
                onToggleTheme={toggleTheme}
              />
            ) : null}
          </div>
        </div>
      </div>

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
