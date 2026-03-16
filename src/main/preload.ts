import { contextBridge, ipcRenderer } from 'electron';

console.log('✅ Pegasus preload loaded');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectPgsFile: () => ipcRenderer.invoke('select-pgs-file'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  readPgsFile: (filePath: string) => ipcRenderer.invoke('read-pgs-file', filePath),
  convertToPgs: (options: {
    filePath: string;
    languages: string[];
    apiKey: string;
    outputDir: string;
  }) => ipcRenderer.invoke('convert-to-pgs', options),
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  setApiKey: (key: string) => ipcRenderer.invoke('set-api-key', key),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (theme: 'dark' | 'light') => ipcRenderer.invoke('set-theme', theme),
  getRecentFiles: () => ipcRenderer.invoke('get-recent-files'),
  addRecentFile: (filePath: string) => ipcRenderer.invoke('add-recent-file', filePath),
  clearRecentFiles: () => ipcRenderer.invoke('clear-recent-files'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openPgsFilePath: () => ipcRenderer.invoke('open-pgs-file-path'),
  onTranslationStatus: (cb: (data: unknown) => void) => {
    ipcRenderer.on('translation-status', (_, data) => cb(data));
    return () => ipcRenderer.removeAllListeners('translation-status');
  },
  onTranslationCompleteLang: (cb: (data: unknown) => void) => {
    ipcRenderer.on('translation-complete-lang', (_, data) => cb(data));
    return () => ipcRenderer.removeAllListeners('translation-complete-lang');
  },
  onTranslationErrorLang: (cb: (data: unknown) => void) => {
    ipcRenderer.on('translation-error-lang', (_, data) => cb(data));
    return () => ipcRenderer.removeAllListeners('translation-error-lang');
  },
});
