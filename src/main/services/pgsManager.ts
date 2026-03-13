import fs from 'node:fs';
import path from 'node:path';

export interface PgsFile {
  version: string;
  originalName: string;
  originalType: 'docx' | 'txt';
  createdAt: string;
  availableLanguages: string[];
  files: Record<string, string>;
}

export async function createPgsFile(
  originalPath: string,
  translatedFiles: Record<string, Buffer>,
  outputDir: string,
): Promise<string> {
  const originalBuffer = await fs.promises.readFile(originalPath);
  const extension = path.extname(originalPath).toLowerCase();

  const originalType: 'docx' | 'txt' = extension === '.docx' ? 'docx' : 'txt';

  const files: Record<string, string> = {
    original: originalBuffer.toString('base64'),
  };

  for (const [language, data] of Object.entries(translatedFiles)) {
    files[language] = data.toString('base64');
  }

  const pgs: PgsFile = {
    version: '1.0',
    originalName: path.basename(originalPath),
    originalType,
    createdAt: new Date().toISOString(),
    availableLanguages: ['original', ...Object.keys(translatedFiles)],
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

  if (!parsed.files?.original || !Array.isArray(parsed.availableLanguages)) {
    throw new Error('Invalid .pgs file format.');
  }

  return parsed;
}
