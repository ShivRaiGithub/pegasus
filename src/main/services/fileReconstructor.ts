import mammoth from 'mammoth';
import { Document, HeadingLevel, Packer, Paragraph } from 'docx';

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
  const originalRaw = await mammoth.extractRawText({ path: originalPath });
  const originalParagraphs = originalRaw.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const paragraphs = translatedChunks.map((chunk, index) => {
    const sourceLine = originalParagraphs[index] ?? '';
    const useHeading = isHeadingCandidate(sourceLine);

    return new Paragraph({
      text: chunk,
      ...(useHeading ? { heading: HeadingLevel.HEADING_1 } : {}),
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
