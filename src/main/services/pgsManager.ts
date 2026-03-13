import fs from 'node:fs';
import path from 'node:path';

export interface PgsFile {
  version: string;
  originalName: string;
  originalType: 'docx' | 'pdf' | 'txt';
  storageFormat: 'html' | 'pdf' | 'text';
  createdAt: string;
  availableLanguages: string[];
  files: Record<string, string>;
}

export async function createPgsFile(
  originalPath: string,
  originalType: 'docx' | 'pdf' | 'txt',
  originalFileBase64: string,
  translatedData: Record<string, string>,
  outputDir: string,
): Promise<string> {
  const storageFormat: 'html' | 'pdf' | 'text' =
    originalType === 'docx' ? 'html' : originalType === 'pdf' ? 'pdf' : 'text';

  const files: Record<string, string> = {
    original: originalFileBase64,
  };

  for (const [language, data] of Object.entries(translatedData)) {
    files[language] = data;
  }

  const pgs: PgsFile = {
    version: '1.1',
    originalName: path.basename(originalPath),
    originalType,
    storageFormat,
    createdAt: new Date().toISOString(),
    availableLanguages: ['original', ...Object.keys(translatedData)],
    files,
  };

  await fs.promises.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${path.parse(originalPath).name}.pgs`);

  await fs.promises.writeFile(outputPath, JSON.stringify(pgs, null, 2), 'utf-8');
  return outputPath;
}

export async function readPgsFile(filePath: string): Promise<PgsFile> {
  const raw = await fs.promises.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as PgsFile;

  if (parsed.version === '1.0') {
    throw new Error('This file was created with an older version of Pegasus. Please reconvert your document.');
  }

  if (
    parsed.version !== '1.1' ||
    !parsed.files?.original ||
    !Array.isArray(parsed.availableLanguages) ||
    (parsed.storageFormat !== 'html' && parsed.storageFormat !== 'pdf' && parsed.storageFormat !== 'text')
  ) {
    throw new Error('Invalid .pgs file format.');
  }

  return parsed;
}
