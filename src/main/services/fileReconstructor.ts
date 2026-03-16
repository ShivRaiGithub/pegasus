import fs from 'node:fs';
import { Document, Packer, Paragraph, TextRun } from 'docx';

export async function reconstructDocx(
  originalPath: string,
  translatedChunks: string[],
): Promise<Buffer> {
  await fs.promises.access(originalPath, fs.constants.R_OK);

  const lines = translatedChunks.flatMap((chunk) => chunk.split(/\r?\n/));

  const paragraphs = lines.map((line) =>
    new Paragraph({
      children: [new TextRun({ text: line })],
      spacing: { after: 200 },
    }),
  );

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
