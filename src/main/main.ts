import fs from 'node:fs';
import path from 'node:path';
import { app, BrowserWindow, dialog, ipcMain, type OpenDialogOptions } from 'electron';
import Store from 'electron-store';
import { extractText, type PageTextMap } from './services/fileExtractor';
import { reconstructDocx, reconstructTxt } from './services/fileReconstructor';
import { createPgsFile, readPgsFile } from './services/pgsManager';
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
    filters: [{ name: 'Documents', extensions: ['docx', 'pdf', 'txt'] }],
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
  let tmpPathToClean: string | null = null;

  try {
    let originalType: 'docx' | 'pdf' | 'txt';
    let originalBase64: string;
    let extractedContent: Awaited<ReturnType<typeof extractText>>;
    const translatedData: Record<string, string> = {};

    if (filePath.toLowerCase().endsWith('.pgs')) {
      const pgsData = await readPgsFile(filePath);
      originalType = pgsData.originalType;
      originalBase64 = pgsData.files['original'];

      tmpPathToClean = path.join(app.getPath('temp'), `pegasus_temp_${Date.now()}.${originalType}`);
      await fs.promises.writeFile(tmpPathToClean, Buffer.from(originalBase64, 'base64'));
      extractedContent = await extractText(tmpPathToClean);

      for (const lang of pgsData.availableLanguages) {
        if (lang !== 'original' && typeof pgsData.files[lang] === 'string') {
          translatedData[lang] = pgsData.files[lang];
        }
      }
    } else {
      extractedContent = await extractText(filePath);
      originalType = extractedContent.metadata.type;
      const originalBytes = await fs.promises.readFile(filePath);
      originalBase64 = originalBytes.toString('base64');
    }

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
          message: `Preparing ${lang.toUpperCase()} document...`,
          lang,
          current: index + 1,
          total: languages.length,
        });

        if (originalType === 'docx') {
          const reconstructedDocx = await reconstructDocx(tmpPathToClean ?? filePath, translatedChunks);
          translatedData[lang] = reconstructedDocx.toString('base64');
        } else if (originalType === 'pdf') {
          const sourcePageTextMap = extractedContent.metadata.structure.pageTextMap ?? [];
          let chunkIndex = 0;

          const translatedPageTextMap: PageTextMap[] = sourcePageTextMap.map((page) => ({
            page: page.page,
            items: page.items.map((item) => {
              const translated = translatedChunks[chunkIndex] ?? item.str;
              chunkIndex += 1;

              return {
                ...item,
                str: translated,
              };
            }),
          }));

          translatedData[lang] = JSON.stringify(translatedPageTextMap);
        } else {
          const translatedTxt = await reconstructTxt(translatedChunks);
          translatedData[lang] = translatedTxt.toString('utf-8');
        }

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

    const originalPayload = originalType === 'txt' ? extractedContent.texts.join('\n') : originalBase64;

    const outputPath = await createPgsFile(filePath, originalType, originalPayload, translatedData, outputDir);
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
  } finally {
    if (tmpPathToClean) {
      await fs.promises.unlink(tmpPathToClean).catch(() => {});
    }
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
