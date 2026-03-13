import fs from 'node:fs';
import path from 'node:path';
import mammoth from 'mammoth';

export interface ExtractedContent {
  texts: string[];
  metadata: {
    type: 'docx' | 'txt';
    originalPath: string;
    structure: {
      paragraphCount?: number;
      lineCount?: number;
    };
  };
}

export async function extractText(filePath: string): Promise<ExtractedContent> {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    const paragraphs = result.value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    return {
      texts: paragraphs,
      metadata: {
        type: 'docx',
        originalPath: filePath,
        structure: {
          paragraphCount: paragraphs.length,
        },
      },
    };
  }

  if (extension === '.txt') {
    const rawText = fs.readFileSync(filePath, 'utf-8');
    const lines = rawText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    return {
      texts: lines,
      metadata: {
        type: 'txt',
        originalPath: filePath,
        structure: {
          lineCount: lines.length,
        },
      },
    };
  }

  throw new Error('Unsupported file type. Please select a DOCX or TXT file.');
}
