export interface PgsFile {
  version: string;
  originalName: string;
  originalType: 'docx' | 'txt';
  createdAt: string;
  availableLanguages: string[];
  files: Record<string, string>;
}

export interface ExtractedContent {
  texts: string[];
  metadata: {
    type: 'docx' | 'txt';
    originalPath: string;
    structure: any;
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
