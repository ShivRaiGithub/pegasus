import { LingoDotDevEngine } from '@lingo.dev/_sdk';

export async function translateChunks(
  chunks: string[],
  targetLocale: string,
  apiKey: string,
  onProgress?: (current: number, total: number) => void,
): Promise<string[]> {
  if (!apiKey.trim()) {
    throw new Error('A valid Lingo.dev API key is required.');
  }

  if (chunks.length === 0) {
    return [];
  }

  try {
    const lingoDotDev = new LingoDotDevEngine({ apiKey });

    const options: Record<string, unknown> = {
      sourceLocale: 'en',
      targetLocale,
    };

    const translatedObject = await (lingoDotDev as any).localizeObject({ chunks }, options);

    const translated = Array.isArray(translatedObject?.chunks)
      ? translatedObject.chunks.map((value: unknown, index: number) =>
          typeof value === 'string' && value.trim().length > 0 ? value : chunks[index],
        )
      : chunks;

    if (onProgress) {
      for (let index = 0; index < translated.length; index += 1) {
        onProgress(index + 1, translated.length);
      }
    }

    return translated;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown translation error';
    throw new Error(`Translation failed for ${targetLocale}: ${message}`);
  }
}
