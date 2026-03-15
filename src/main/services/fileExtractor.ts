import fs from 'node:fs';
import path from 'node:path';
import mammoth from 'mammoth';

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

export interface ExtractedContent {
  texts: string[];
  fileBase64: string; // raw file as base64 — used by renderer for docx-preview / pdfjs
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

async function extractDocx(filePath: string): Promise<ExtractedContent> {
  const buffer = await fs.promises.readFile(filePath);

  // extractRawText for translation chunking only
  const result = await mammoth.extractRawText({ buffer });
  const paragraphs = result.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    texts: paragraphs,
    fileBase64: buffer.toString('base64'), // full file for docx-preview rendering
    metadata: {
      type: 'docx',
      originalPath: filePath,
      structure: {
        paragraphCount: paragraphs.length,
      },
    },
  };
}

async function extractPdf(filePath: string): Promise<ExtractedContent> {
  if (!('toHex' in Uint8Array.prototype)) {
    Object.defineProperty(Uint8Array.prototype, 'toHex', {
      value: function () {
        return Buffer.from(this).toString('hex');
      },
      enumerable: false,
    });
  }

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');

  const buffer = await fs.promises.readFile(filePath);
  const data = new Uint8Array(buffer);
  const document = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

  const texts: string[] = [];
  const pageTextMap: PageTextMap[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });

    const items: PdfTextItem[] = textContent.items
      .filter((item): item is any => 'str' in item && typeof item.str === 'string' && item.str.trim().length > 0)
      .map((item) => ({
        str: item.str,
        x: item.transform[4],
        y: viewport.height - item.transform[5],
        width: item.width,
        height: item.height,
      }));

    pageTextMap.push({ page: pageNumber, items });

    for (const item of items) {
      texts.push(item.str);
    }
  }

  return {
    texts,
    fileBase64: buffer.toString('base64'), // full PDF for pdfjs canvas rendering
    metadata: {
      type: 'pdf',
      originalPath: filePath,
      structure: {
        pageTextMap,
        numPages: document.numPages,
      },
    },
  };
}

function extractTxt(filePath: string): ExtractedContent {
  const rawText = fs.readFileSync(filePath, 'utf-8');
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    texts: lines,
    fileBase64: Buffer.from(rawText, 'utf-8').toString('base64'),
    metadata: {
      type: 'txt',
      originalPath: filePath,
      structure: {
        lineCount: lines.length,
      },
    },
  };
}

export async function extractText(filePath: string): Promise<ExtractedContent> {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === '.docx') return extractDocx(filePath);
  if (extension === '.pdf') return extractPdf(filePath);
  if (extension === '.txt') return extractTxt(filePath);

  throw new Error('Unsupported file type. Please select a DOCX, PDF, or TXT file.');
}