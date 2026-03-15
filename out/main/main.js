import fs from "node:fs";
import path from "node:path";
import { ipcMain, dialog, app, BrowserWindow } from "electron";
import Store from "electron-store";
import mammoth from "mammoth";
import { Paragraph, HeadingLevel, TextRun, Document, Packer } from "docx";
import { LingoDotDevEngine } from "@lingo.dev/_sdk";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
async function extractDocx(filePath) {
  const buffer = await fs.promises.readFile(filePath);
  const result = await mammoth.extractRawText({ buffer });
  const paragraphs = result.value.split("\n").map((line) => line.trim()).filter(Boolean);
  return {
    texts: paragraphs,
    fileBase64: buffer.toString("base64"),
    // full file for docx-preview rendering
    metadata: {
      type: "docx",
      originalPath: filePath,
      structure: {
        paragraphCount: paragraphs.length
      }
    }
  };
}
async function extractPdf(filePath) {
  if (!("toHex" in Uint8Array.prototype)) {
    Object.defineProperty(Uint8Array.prototype, "toHex", {
      value: function() {
        return Buffer.from(this).toString("hex");
      },
      enumerable: false
    });
  }
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = require2.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
  const buffer = await fs.promises.readFile(filePath);
  const data = new Uint8Array(buffer);
  const document = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const texts = [];
  const pageTextMap = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });
    const items = textContent.items.filter((item) => "str" in item && typeof item.str === "string" && item.str.trim().length > 0).map((item) => ({
      str: item.str,
      x: item.transform[4],
      y: viewport.height - item.transform[5],
      width: item.width,
      height: item.height
    }));
    pageTextMap.push({ page: pageNumber, items });
    for (const item of items) {
      texts.push(item.str);
    }
  }
  return {
    texts,
    fileBase64: buffer.toString("base64"),
    // full PDF for pdfjs canvas rendering
    metadata: {
      type: "pdf",
      originalPath: filePath,
      structure: {
        pageTextMap,
        numPages: document.numPages
      }
    }
  };
}
function extractTxt(filePath) {
  const rawText = fs.readFileSync(filePath, "utf-8");
  const lines = rawText.split("\n").map((line) => line.trim()).filter(Boolean);
  return {
    texts: lines,
    fileBase64: Buffer.from(rawText, "utf-8").toString("base64"),
    metadata: {
      type: "txt",
      originalPath: filePath,
      structure: {
        lineCount: lines.length
      }
    }
  };
}
async function extractText(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".docx") return extractDocx(filePath);
  if (extension === ".pdf") return extractPdf(filePath);
  if (extension === ".txt") return extractTxt(filePath);
  throw new Error("Unsupported file type. Please select a DOCX, PDF, or TXT file.");
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
  const originalBuffer = await fs.promises.readFile(originalPath);
  const htmlResult = await mammoth.convertToHtml({ buffer: originalBuffer });
  const originalLines = htmlResult.value.replace(/<[^>]+>/g, "\n").split("\n").map((line) => line.trim()).filter(Boolean);
  const paragraphs = translatedChunks.map((chunk, index) => {
    const sourceLine = originalLines[index] ?? chunk;
    const useHeading = isHeadingCandidate(sourceLine);
    if (useHeading) {
      return new Paragraph({
        text: chunk,
        heading: HeadingLevel.HEADING_1
      });
    }
    return new Paragraph({
      children: [new TextRun({ text: chunk, size: 24 })],
      spacing: { after: 200 }
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
async function createPgsFile(originalPath, originalType, originalFileBase64, translatedData, outputDir) {
  const storageFormat = originalType === "docx" ? "html" : originalType === "pdf" ? "pdf" : "text";
  const files = {
    original: originalFileBase64
  };
  for (const [language, data] of Object.entries(translatedData)) {
    files[language] = data;
  }
  const pgs = {
    version: "1.1",
    originalName: path.basename(originalPath),
    originalType,
    storageFormat,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    availableLanguages: ["original", ...Object.keys(translatedData)],
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
  if (parsed.version === "1.0") {
    throw new Error("This file was created with an older version of Pegasus. Please reconvert your document.");
  }
  if (parsed.version !== "1.1" || !parsed.files?.original || !Array.isArray(parsed.availableLanguages) || parsed.storageFormat !== "html" && parsed.storageFormat !== "pdf" && parsed.storageFormat !== "text") {
    throw new Error("Invalid .pgs file format.");
  }
  return parsed;
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
    filters: [{ name: "Documents", extensions: ["docx", "pdf", "txt"] }]
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
  let tmpPathToClean = null;
  try {
    let originalType;
    let originalBase64;
    let extractedContent;
    const translatedData = {};
    if (filePath.toLowerCase().endsWith(".pgs")) {
      const pgsData = await readPgsFile(filePath);
      originalType = pgsData.originalType;
      originalBase64 = pgsData.files["original"];
      tmpPathToClean = path.join(app.getPath("temp"), `pegasus_temp_${Date.now()}.${originalType}`);
      await fs.promises.writeFile(tmpPathToClean, Buffer.from(originalBase64, "base64"));
      extractedContent = await extractText(tmpPathToClean);
      for (const lang of pgsData.availableLanguages) {
        if (lang !== "original" && typeof pgsData.files[lang] === "string") {
          translatedData[lang] = pgsData.files[lang];
        }
      }
    } else {
      extractedContent = await extractText(filePath);
      originalType = extractedContent.metadata.type;
      const originalBytes = await fs.promises.readFile(filePath);
      originalBase64 = originalBytes.toString("base64");
    }
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
          message: `Preparing ${lang.toUpperCase()} document...`,
          lang,
          current: index + 1,
          total: languages.length
        });
        if (originalType === "docx") {
          const reconstructedDocx = await reconstructDocx(tmpPathToClean ?? filePath, translatedChunks);
          translatedData[lang] = reconstructedDocx.toString("base64");
        } else if (originalType === "pdf") {
          const sourcePageTextMap = extractedContent.metadata.structure.pageTextMap ?? [];
          let chunkIndex = 0;
          const translatedPageTextMap = sourcePageTextMap.map((page) => ({
            page: page.page,
            items: page.items.map((item) => {
              const translated = translatedChunks[chunkIndex] ?? item.str;
              chunkIndex += 1;
              return {
                ...item,
                str: translated
              };
            })
          }));
          translatedData[lang] = JSON.stringify(translatedPageTextMap);
        } else {
          const translatedTxt = await reconstructTxt(translatedChunks);
          translatedData[lang] = translatedTxt.toString("utf-8");
        }
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
    const originalPayload = originalType === "txt" ? extractedContent.texts.join("\n") : originalBase64;
    const outputPath = await createPgsFile(filePath, originalType, originalPayload, translatedData, outputDir);
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
  } finally {
    if (tmpPathToClean) {
      await fs.promises.unlink(tmpPathToClean).catch(() => {
      });
    }
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
