"use strict";
const electron = require("electron");
console.log("✅ Pegasus preload loaded");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  selectFile: () => electron.ipcRenderer.invoke("select-file"),
  selectPgsFile: () => electron.ipcRenderer.invoke("select-pgs-file"),
  selectFolder: () => electron.ipcRenderer.invoke("select-folder"),
  readFile: (filePath) => electron.ipcRenderer.invoke("read-file", filePath),
  readPgsFile: (filePath) => electron.ipcRenderer.invoke("read-pgs-file", filePath),
  convertToPgs: (options) => electron.ipcRenderer.invoke("convert-to-pgs", options),
  getApiKey: () => electron.ipcRenderer.invoke("get-api-key"),
  setApiKey: (key) => electron.ipcRenderer.invoke("set-api-key", key),
  getTheme: () => electron.ipcRenderer.invoke("get-theme"),
  setTheme: (theme) => electron.ipcRenderer.invoke("set-theme", theme),
  getRecentFiles: () => electron.ipcRenderer.invoke("get-recent-files"),
  addRecentFile: (filePath) => electron.ipcRenderer.invoke("add-recent-file", filePath),
  clearRecentFiles: () => electron.ipcRenderer.invoke("clear-recent-files"),
  getAppVersion: () => electron.ipcRenderer.invoke("get-app-version"),
  openPgsFilePath: () => electron.ipcRenderer.invoke("open-pgs-file-path"),
  onTranslationStatus: (cb) => {
    electron.ipcRenderer.on("translation-status", (_, data) => cb(data));
    return () => electron.ipcRenderer.removeAllListeners("translation-status");
  },
  onTranslationCompleteLang: (cb) => {
    electron.ipcRenderer.on("translation-complete-lang", (_, data) => cb(data));
    return () => electron.ipcRenderer.removeAllListeners("translation-complete-lang");
  },
  onTranslationErrorLang: (cb) => {
    electron.ipcRenderer.on("translation-error-lang", (_, data) => cb(data));
    return () => electron.ipcRenderer.removeAllListeners("translation-error-lang");
  }
});
