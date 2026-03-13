export interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageTextMap {
  page: number;
  items: PdfTextItem[];
}

export interface PgsFile {
  version: string;
  originalName: string;
  originalType: 'docx' | 'pdf' | 'txt';
  storageFormat: 'html' | 'pdf' | 'text';
  createdAt: string;
  availableLanguages: string[];
  files: Record<string, string>;
}

export interface ExtractedContent {
  texts: string[];
  fileBase64: string;
  metadata: {
    type: 'docx' | 'pdf' | 'txt';
    originalPath: string;
    structure: {
      paragraphCount?: number;
      lineCount?: number;
      pageTextMap?: PageTextMap[];
      numPages?: number;
    };
  };
}

export type AppScreen = 'home' | 'viewer' | 'convert';

export interface OpenFileState {
  type: 'regular' | 'pgs';
  filePath: string;
  fileName: string;
  pgsData?: PgsFile;
  extractedContent?: ExtractedContent;
}
