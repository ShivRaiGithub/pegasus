import fs from 'node:fs';
import path from 'node:path';
import { app, BrowserWindow, dialog, ipcMain, type OpenDialogOptions } from 'electron';
import Store from 'electron-store';
import { extractText } from './services/fileExtractor';
import { createPgsFile, readPgsFile } from './services/pgsManager';
import { reconstructDocx, reconstructTxt } from './services/fileReconstructor';
import { translateChunks } from './services/translator';

type Theme = 'dark' | 'light';

interface StoreSchema {
  apiKey: string;
  theme: Theme;
  recentFiles: string[];
}

interface ConvertOptions {
  filePath: string;
  languages: string[];
  apiKey: string;
  instructions?: string;
  outputDir: string;
}

const store = new Store<StoreSchema>({
  defaults: {
    apiKey: '',
    theme: 'dark',
    recentFiles: [],
  },
});

let mainWindow: BrowserWindow | null = null;
let pendingOpenFilePath: string | null = null;

function addRecentFilePath(filePath: string): void {
  const current = store.get('recentFiles', []);
  const deduped = current.filter((item) => item !== filePath);
  const updated = [filePath, ...deduped].slice(0, 10);
  store.set('recentFiles', updated);
}

function parseFileFromArgv(argv: string[]): string | null {
  const candidate = argv.find((arg) => !arg.startsWith('-') && arg.toLowerCase().endsWith('.pgs'));
  if (!candidate) {
    return null;
  }
  return fs.existsSync(candidate) ? path.resolve(candidate) : null;
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow = win;

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });
}

ipcMain.handle('select-file', async () => {
  const options: OpenDialogOptions = {
    properties: ['openFile'],
    filters: [{ name: 'Documents', extensions: ['docx', 'txt'] }],
  };

  const result = mainWindow
    ? await dialog.showOpenDialog(mainWindow, options)
    : await dialog.showOpenDialog(options);

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('select-pgs-file', async () => {
  const options: OpenDialogOptions = {
    properties: ['openFile'],
    filters: [{ name: 'Pegasus Files', extensions: ['pgs'] }],
  };

  const result = mainWindow
    ? await dialog.showOpenDialog(mainWindow, options)
    : await dialog.showOpenDialog(options);

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('select-folder', async () => {
  const options: OpenDialogOptions = {
    properties: ['openDirectory', 'createDirectory'],
  };

  const result = mainWindow
    ? await dialog.showOpenDialog(mainWindow, options)
    : await dialog.showOpenDialog(options);

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('read-file', async (_, filePath: string) => extractText(filePath));
ipcMain.handle('read-pgs-file', async (_, filePath: string) => readPgsFile(filePath));

ipcMain.handle('convert-to-pgs', async (event, options: ConvertOptions) => {
  const { filePath, languages, apiKey, instructions, outputDir } = options;

  try {
    const extractedContent = await extractText(filePath);
    const translatedBuffers: Record<string, Buffer> = {};

    for (let index = 0; index < languages.length; index += 1) {
      const lang = languages[index];

      event.sender.send('translation-status', {
        phase: 'translating',
        message: `Translating ${lang.toUpperCase()}...`,
        lang,
        current: index + 1,
        total: languages.length,
      });

      try {
        const translatedChunks = await translateChunks(
          extractedContent.texts,
          lang,
          apiKey,
          instructions,
          (current, total) => {
            event.sender.send('translation-status', {
              phase: 'translating',
              message: `Translating ${lang.toUpperCase()} (${current}/${total})`,
              lang,
              current,
              total,
            });
          },
        );

        event.sender.send('translation-status', {
          phase: 'reconstructing',
          message: `Reconstructing ${lang.toUpperCase()} file...`,
          lang,
          current: index + 1,
          total: languages.length,
        });

        const reconstructed =
          extractedContent.metadata.type === 'docx'
            ? await reconstructDocx(filePath, translatedChunks)
            : await reconstructTxt(translatedChunks);

        translatedBuffers[lang] = reconstructed;

        event.sender.send('translation-complete-lang', { lang });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown translation error';

        event.sender.send('translation-error-lang', {
          lang,
          error: message,
        });

        throw error;
      }
    }

    event.sender.send('translation-status', {
      phase: 'packaging',
      message: 'Creating .pgs package...',
      current: languages.length,
      total: languages.length,
    });

    const outputPath = await createPgsFile(filePath, translatedBuffers, outputDir);
    addRecentFilePath(outputPath);

    return {
      success: true,
      outputPath,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown conversion error';
    return {
      success: false,
      error: message,
    };
  }
});

ipcMain.handle('get-api-key', () => store.get('apiKey', ''));
ipcMain.handle('set-api-key', (_, key: string) => {
  store.set('apiKey', key);
});

ipcMain.handle('get-theme', () => store.get('theme', 'dark'));
ipcMain.handle('set-theme', (_, theme: Theme) => {
  store.set('theme', theme === 'light' ? 'light' : 'dark');
});

ipcMain.handle('get-recent-files', () => store.get('recentFiles', []));
ipcMain.handle('add-recent-file', (_, filePath: string) => {
  addRecentFilePath(filePath);
});
ipcMain.handle('clear-recent-files', () => {
  store.set('recentFiles', []);
});
ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('open-pgs-file-path', () => {
  const value = pendingOpenFilePath;
  pendingOpenFilePath = null;
  return value;
});

app.on('open-file', (event, filePath) => {
  event.preventDefault();
  pendingOpenFilePath = filePath;
});

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    const argPath = parseFileFromArgv(process.argv);
    if (argPath) {
      pendingOpenFilePath = argPath;
    }
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
