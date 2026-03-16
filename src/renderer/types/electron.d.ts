import type { ExtractedContent, PgsFile } from './pgs';

type Theme = 'dark' | 'light';

interface TranslationStatusEvent {
  phase: string;
  message: string;
  lang?: string;
  current?: number;
  total?: number;
}

interface ConvertToPgsOptions {
  filePath: string;
  languages: string[];
  apiKey: string;
  outputDir: string;
}

interface ConvertToPgsResult {
  success: boolean;
  outputPath?: string;
  error?: string;
}

interface ElectronAPI {
  selectFile: () => Promise<string | null>;
  selectPgsFile: () => Promise<string | null>;
  selectFolder: () => Promise<string | null>;
  readFile: (filePath: string) => Promise<ExtractedContent>;
  readPgsFile: (filePath: string) => Promise<PgsFile>;
  convertToPgs: (options: ConvertToPgsOptions) => Promise<ConvertToPgsResult>;
  getApiKey: () => Promise<string>;
  setApiKey: (key: string) => Promise<void>;
  getTheme: () => Promise<Theme>;
  setTheme: (theme: Theme) => Promise<void>;
  getRecentFiles: () => Promise<string[]>;
  addRecentFile: (filePath: string) => Promise<void>;
  clearRecentFiles: () => Promise<void>;
  getAppVersion: () => Promise<string>;
  openPgsFilePath: () => Promise<string | null>;
  onTranslationStatus: (cb: (data: TranslationStatusEvent) => void) => () => void;
  onTranslationCompleteLang: (cb: (data: { lang: string }) => void) => () => void;
  onTranslationErrorLang: (cb: (data: { lang: string; error: string }) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
