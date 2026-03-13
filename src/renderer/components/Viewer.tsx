import { useEffect, useMemo, useState } from 'react';
import mammoth from 'mammoth';
import type { OpenFileState } from '../types/pgs';
import FallbackModal from './FallbackModal';

interface ViewerProps {
  openFile: OpenFileState;
  selectedLanguage: string;
  isDark: boolean;
  onConvertToPgs: () => void;
  onSelectLanguage: (lang: string) => void;
}

function decodeBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i += 1) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes.buffer;
}

function decodeBase64ToText(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function Viewer({ openFile, selectedLanguage, onConvertToPgs, onSelectLanguage }: ViewerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [renderedHtml, setRenderedHtml] = useState('');
  const [renderedText, setRenderedText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isPgs = openFile.type === 'pgs';
  const availableLanguages = openFile.pgsData?.availableLanguages ?? [];
  const missingSelectedLanguage = isPgs && !availableLanguages.includes(selectedLanguage);

  useEffect(() => {
    let active = true;

    const renderPgsContent = async () => {
      if (!isPgs || !openFile.pgsData) {
        return;
      }

      if (missingSelectedLanguage) {
        setRenderedHtml('');
        setRenderedText('');
        return;
      }

      const selectedBase64 = openFile.pgsData.files[selectedLanguage];
      if (!selectedBase64) {
        setError('Unable to read selected language content.');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        if (openFile.pgsData.originalType === 'docx') {
          const arrayBuffer = decodeBase64ToArrayBuffer(selectedBase64);
          const result = await mammoth.convertToHtml({ arrayBuffer });
          if (active) {
            setRenderedHtml(result.value);
            setRenderedText('');
          }
        } else {
          const plainText = decodeBase64ToText(selectedBase64);
          if (active) {
            setRenderedText(plainText);
            setRenderedHtml('');
          }
        }
      } catch (renderError) {
        if (active) {
          const message = renderError instanceof Error ? renderError.message : 'Failed to render file.';
          setError(message);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    renderPgsContent();

    return () => {
      active = false;
    };
  }, [isPgs, missingSelectedLanguage, openFile, selectedLanguage]);

  const regularParagraphs = useMemo(() => openFile.extractedContent?.texts ?? [], [openFile]);

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-12 pt-6">
      {openFile.type === 'regular' ? (
        <div className="mb-4 flex items-center justify-end">
          <button
            type="button"
            onClick={onConvertToPgs}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Convert to .pgs
          </button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-surface">
        {openFile.type === 'regular' ? (
          <div className="viewer-prose mx-auto max-w-[800px] px-12 py-12 text-textPrimary">
            {regularParagraphs.map((paragraph, index) => (
              <p key={`${paragraph.slice(0, 20)}-${index}`}>{paragraph}</p>
            ))}
          </div>
        ) : null}

        {openFile.type === 'pgs' ? (
          <div className="min-h-[480px] p-6">
            {isLoading ? (
              <div className="flex h-72 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
              </div>
            ) : null}

            {!isLoading && error ? <p className="text-sm text-error">{error}</p> : null}

            {!isLoading && !error && renderedHtml ? (
              <div
                className="viewer-prose mx-auto max-w-[800px] px-12 py-12 text-textPrimary"
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            ) : null}

            {!isLoading && !error && renderedText ? (
              <pre className="mx-auto max-w-[800px] whitespace-pre-wrap px-12 py-12 text-base leading-8 text-textPrimary">
                {renderedText}
              </pre>
            ) : null}
          </div>
        ) : null}
      </div>

      {missingSelectedLanguage && openFile.type === 'pgs' ? (
        <FallbackModal
          missingLanguage={selectedLanguage}
          availableLanguages={availableLanguages}
          onTranslateNow={onConvertToPgs}
          onSelectLanguage={onSelectLanguage}
          onViewOriginal={() => onSelectLanguage('original')}
          isDark
        />
      ) : null}
    </section>
  );
}

export default Viewer;
