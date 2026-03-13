import fs from 'node:fs';
import mammoth from 'mammoth';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';

function isHeadingCandidate(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) {
    return false;
  }

  const isAllCaps = normalized === normalized.toUpperCase() && /[A-Z]/.test(normalized);
  const isShortLine = normalized.length <= 60;
  return isAllCaps || isShortLine;
}

export async function reconstructDocx(
  originalPath: string,
  translatedChunks: string[],
): Promise<Buffer> {
  const originalBuffer = await fs.promises.readFile(originalPath);
  const htmlResult = await mammoth.convertToHtml({ buffer: originalBuffer });
  const originalLines = htmlResult.value
    .replace(/<[^>]+>/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const paragraphs = translatedChunks.map((chunk, index) => {
    const sourceLine = originalLines[index] ?? chunk;
    const useHeading = isHeadingCandidate(sourceLine);

    if (useHeading) {
      return new Paragraph({
        text: chunk,
        heading: HeadingLevel.HEADING_1,
      });
    }

    return new Paragraph({
      children: [new TextRun({ text: chunk, size: 24 })],
      spacing: { after: 200 },
    });
  });

  const doc = new Document({
    sections: [
      {
        children: paragraphs.length > 0 ? paragraphs : [new Paragraph({ text: '' })],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

export async function reconstructTxt(translatedChunks: string[]): Promise<Buffer> {
  const output = translatedChunks.join('\n');
  return Buffer.from(output, 'utf-8');
}
