import fs from "node:fs";
import path from "node:path";
import { ipcMain, dialog, app, BrowserWindow } from "electron";
import Store from "electron-store";
import mammoth from "mammoth";
import { Paragraph, HeadingLevel, Document, Packer } from "docx";
import { LingoDotDevEngine } from "@lingo.dev/_sdk";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
async function extractText(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".docx") {
    const result = await mammoth.extractRawText({ path: filePath });
    const paragraphs = result.value.split("\n").map((line) => line.trim()).filter(Boolean);
    return {
      texts: paragraphs,
      metadata: {
        type: "docx",
        originalPath: filePath,
        structure: {
          paragraphCount: paragraphs.length
        }
      }
    };
  }
  if (extension === ".txt") {
    const rawText = fs.readFileSync(filePath, "utf-8");
    const lines = rawText.split("\n").map((line) => line.trim()).filter(Boolean);
    return {
      texts: lines,
      metadata: {
        type: "txt",
        originalPath: filePath,
        structure: {
          lineCount: lines.length
        }
      }
    };
  }
  throw new Error("Unsupported file type. Please select a DOCX or TXT file.");
}
async function createPgsFile(originalPath, translatedFiles, outputDir) {
  const originalBuffer = await fs.promises.readFile(originalPath);
  const extension = path.extname(originalPath).toLowerCase();
  const originalType = extension === ".docx" ? "docx" : "txt";
  const files = {
    original: originalBuffer.toString("base64")
  };
  for (const [language, data] of Object.entries(translatedFiles)) {
    files[language] = data.toString("base64");
  }
  const pgs = {
    version: "1.0",
    originalName: path.basename(originalPath),
    originalType,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    availableLanguages: ["original", ...Object.keys(translatedFiles)],
    files
  };
  await fs.promises.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${path.parse(originalPath).name}.pgs`);
  await fs.promises.writeFile(outputPath, JSON.stringify(pgs, null, 2), "utf-8");
  return outputPath;
}
async function readPgsFile(filePath) {
  const raw = await fs.promises.readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  if (!parsed.files?.original || !Array.isArray(parsed.availableLanguages)) {
    throw new Error("Invalid .pgs file format.");
  }
  return parsed;
}
function isHeadingCandidate(text) {
  const normalized = text.trim();
  if (!normalized) {
    return false;
  }
  const isAllCaps = normalized === normalized.toUpperCase() && /[A-Z]/.test(normalized);
  const isShortLine = normalized.length <= 60;
  return isAllCaps || isShortLine;
}
async function reconstructDocx(originalPath, translatedChunks) {
  const originalRaw = await mammoth.extractRawText({ path: originalPath });
  const originalParagraphs = originalRaw.value.split("\n").map((line) => line.trim()).filter(Boolean);
  const paragraphs = translatedChunks.map((chunk, index) => {
    const sourceLine = originalParagraphs[index] ?? "";
    const useHeading = isHeadingCandidate(sourceLine);
    return new Paragraph({
      text: chunk,
      ...useHeading ? { heading: HeadingLevel.HEADING_1 } : {}
    });
  });
  const doc = new Document({
    sections: [
      {
        children: paragraphs.length > 0 ? paragraphs : [new Paragraph({ text: "" })]
      }
    ]
  });
  return Packer.toBuffer(doc);
}
async function reconstructTxt(translatedChunks) {
  const output = translatedChunks.join("\n");
  return Buffer.from(output, "utf-8");
}
async function translateChunks(chunks, targetLocale, apiKey, instructions, onProgress) {
  if (!apiKey.trim()) {
    throw new Error("A valid Lingo.dev API key is required.");
  }
  if (chunks.length === 0) {
    return [];
  }
  try {
    const lingoDotDev = new LingoDotDevEngine({ apiKey });
    const options = {
      sourceLocale: "en",
      targetLocale
    };
    if (instructions?.trim()) {
      options.instructions = instructions.trim();
    }
    const translatedObject = await lingoDotDev.localizeObject({ chunks }, options);
    const translated = Array.isArray(translatedObject?.chunks) ? translatedObject.chunks.map(
      (value, index) => typeof value === "string" && value.trim().length > 0 ? value : chunks[index]
    ) : chunks;
    if (onProgress) {
      for (let index = 0; index < translated.length; index += 1) {
        onProgress(index + 1, translated.length);
      }
    }
    return translated;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown translation error";
    throw new Error(`Translation failed for ${targetLocale}: ${message}`);
  }
}
const store = new Store({
  defaults: {
    apiKey: "",
    theme: "dark",
    recentFiles: []
  }
});
let mainWindow = null;
let pendingOpenFilePath = null;
function addRecentFilePath(filePath) {
  const current = store.get("recentFiles", []);
  const deduped = current.filter((item) => item !== filePath);
  const updated = [filePath, ...deduped].slice(0, 10);
  store.set("recentFiles", updated);
}
function parseFileFromArgv(argv) {
  const candidate = argv.find((arg) => !arg.startsWith("-") && arg.toLowerCase().endsWith(".pgs"));
  if (!candidate) {
    return null;
  }
  return fs.existsSync(candidate) ? path.resolve(candidate) : null;
}
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow = win;
  if (process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  win.on("closed", () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });
}
ipcMain.handle("select-file", async () => {
  const options = {
    properties: ["openFile"],
    filters: [{ name: "Documents", extensions: ["docx", "txt"] }]
  };
  const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});
ipcMain.handle("select-pgs-file", async () => {
  const options = {
    properties: ["openFile"],
    filters: [{ name: "Pegasus Files", extensions: ["pgs"] }]
  };
  const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});
ipcMain.handle("select-folder", async () => {
  const options = {
    properties: ["openDirectory", "createDirectory"]
  };
  const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});
ipcMain.handle("read-file", async (_, filePath) => extractText(filePath));
ipcMain.handle("read-pgs-file", async (_, filePath) => readPgsFile(filePath));
ipcMain.handle("convert-to-pgs", async (event, options) => {
  const { filePath, languages, apiKey, instructions, outputDir } = options;
  try {
    const extractedContent = await extractText(filePath);
    const translatedBuffers = {};
    for (let index = 0; index < languages.length; index += 1) {
      const lang = languages[index];
      event.sender.send("translation-status", {
        phase: "translating",
        message: `Translating ${lang.toUpperCase()}...`,
        lang,
        current: index + 1,
        total: languages.length
      });
      try {
        const translatedChunks = await translateChunks(
          extractedContent.texts,
          lang,
          apiKey,
          instructions,
          (current, total) => {
            event.sender.send("translation-status", {
              phase: "translating",
              message: `Translating ${lang.toUpperCase()} (${current}/${total})`,
              lang,
              current,
              total
            });
          }
        );
        event.sender.send("translation-status", {
          phase: "reconstructing",
          message: `Reconstructing ${lang.toUpperCase()} file...`,
          lang,
          current: index + 1,
          total: languages.length
        });
        const reconstructed = extractedContent.metadata.type === "docx" ? await reconstructDocx(filePath, translatedChunks) : await reconstructTxt(translatedChunks);
        translatedBuffers[lang] = reconstructed;
        event.sender.send("translation-complete-lang", { lang });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown translation error";
        event.sender.send("translation-error-lang", {
          lang,
          error: message
        });
        throw error;
      }
    }
    event.sender.send("translation-status", {
      phase: "packaging",
      message: "Creating .pgs package...",
      current: languages.length,
      total: languages.length
    });
    const outputPath = await createPgsFile(filePath, translatedBuffers, outputDir);
    addRecentFilePath(outputPath);
    return {
      success: true,
      outputPath
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown conversion error";
    return {
      success: false,
      error: message
    };
  }
});
ipcMain.handle("get-api-key", () => store.get("apiKey", ""));
ipcMain.handle("set-api-key", (_, key) => {
  store.set("apiKey", key);
});
ipcMain.handle("get-theme", () => store.get("theme", "dark"));
ipcMain.handle("set-theme", (_, theme) => {
  store.set("theme", theme === "light" ? "light" : "dark");
});
ipcMain.handle("get-recent-files", () => store.get("recentFiles", []));
ipcMain.handle("add-recent-file", (_, filePath) => {
  addRecentFilePath(filePath);
});
ipcMain.handle("clear-recent-files", () => {
  store.set("recentFiles", []);
});
ipcMain.handle("get-app-version", () => app.getVersion());
ipcMain.handle("open-pgs-file-path", () => {
  const value = pendingOpenFilePath;
  pendingOpenFilePath = null;
  return value;
});
app.on("open-file", (event, filePath) => {
  event.preventDefault();
  pendingOpenFilePath = filePath;
});
app.whenReady().then(() => {
  if (process.platform === "win32") {
    const argPath = parseFileFromArgv(process.argv);
    if (argPath) {
      pendingOpenFilePath = argPath;
    }
  }
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
