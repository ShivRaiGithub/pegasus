import { useEffect, useMemo, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import type { OpenFileState, PageTextMap } from '../types/pgs';
import FallbackModal from './FallbackModal';
import PDFViewer from './PDFViewer.tsx';

interface ViewerProps {
  openFile: OpenFileState;
  selectedLanguage: string;
  isDark: boolean;
  onConvertToPgs: () => void;
  onSelectLanguage: (lang: string) => void;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);

  for (let index = 0; index < binaryStr.length; index += 1) {
    bytes[index] = binaryStr.charCodeAt(index);
  }

  return bytes.buffer;
}

function Viewer({ openFile, selectedLanguage, isDark, onConvertToPgs, onSelectLanguage }: ViewerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const docxContainerRef = useRef<HTMLDivElement | null>(null);

  const isPgs = openFile.type === 'pgs';
  const fileType = openFile.type === 'pgs' ? openFile.pgsData?.originalType : openFile.extractedContent?.metadata.type;
  const availableLanguages = openFile.pgsData?.availableLanguages ?? [];
  const missingSelectedLanguage = isPgs && !availableLanguages.includes(selectedLanguage);

  const selectedPgsPayload = useMemo(() => {
    if (!isPgs || !openFile.pgsData || missingSelectedLanguage) {
      return '';
    }

    return openFile.pgsData.files[selectedLanguage] ?? '';
  }, [isPgs, missingSelectedLanguage, openFile.pgsData, selectedLanguage]);

  const regularBase64 = openFile.extractedContent?.fileBase64 ?? '';

  const docxBase64 = useMemo(() => {
    if (fileType !== 'docx') {
      return '';
    }

    if (openFile.type === 'pgs') {
      return selectedPgsPayload;
    }

    return regularBase64;
  }, [fileType, openFile.type, regularBase64, selectedPgsPayload]);

  const pdfBase64 = useMemo(() => {
    if (fileType !== 'pdf') {
      return '';
    }

    if (openFile.type === 'pgs') {
      return openFile.pgsData?.files.original ?? '';
    }

    return regularBase64;
  }, [fileType, openFile.pgsData?.files.original, openFile.type, regularBase64]);

  const translatedPageTextMap = useMemo<PageTextMap[] | undefined>(() => {
    if (fileType !== 'pdf' || openFile.type !== 'pgs' || selectedLanguage === 'original') {
      return undefined;
    }

    const raw = openFile.pgsData?.files[selectedLanguage];
    if (!raw) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(raw) as PageTextMap[];
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }, [fileType, openFile.pgsData?.files, openFile.type, selectedLanguage]);

  const txtContent = useMemo(() => {
    if (fileType !== 'txt') {
      return '';
    }

    if (openFile.type === 'pgs') {
      return selectedPgsPayload;
    }

    return openFile.extractedContent?.texts.join('\n') ?? '';
  }, [fileType, openFile.extractedContent?.texts, openFile.type, selectedPgsPayload]);

  // Consolidated rendering function for docx-preview
  const renderDocx = async (base64: string) => {
    if (!docxContainerRef.current) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      docxContainerRef.current.innerHTML = '';
      const arrayBuffer = base64ToArrayBuffer(base64);
      await renderAsync(arrayBuffer, docxContainerRef.current, undefined, {
        className: 'docx-preview',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        ignoreLastRenderedPageBreak: true,
        experimental: false,
        trimXmlDeclaration: true,
        useBase64URL: true,
        renderChanges: false,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
      });
    } catch (err) {
      console.error('docx-preview failed:', err);
      setErrorMessage('Failed to render document');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!openFile) return;

    if (fileType !== 'docx') {
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    if (openFile.type === 'regular' && openFile.extractedContent?.fileBase64) {
      void renderDocx(openFile.extractedContent.fileBase64);
    } else if (openFile.type === 'pgs' && openFile.pgsData) {
      console.log('pgsData files keys:', Object.keys(openFile.pgsData.files));
      
      const langBase64 =
        selectedLanguage === 'original'
          ? openFile.pgsData.files['original']
          : openFile.pgsData.files[selectedLanguage];

      if (langBase64) {
        void renderDocx(langBase64);
      }
      // if language not available, FallbackModal handles the UI
    }
  }, [openFile, selectedLanguage, fileType]);

  useEffect(() => {
    if (fileType !== 'docx') {
      setIsLoading(false);
      setErrorMessage(null);
    }
  }, [fileType]);

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
        {missingSelectedLanguage ? null : (
          <div className="min-h-[480px] p-6">
            {fileType === 'docx' ? (
              <div style={{ position: 'relative' }}>
                <div className="docx-container" ref={docxContainerRef} />
                {isLoading && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(10,10,15,0.7)',
                    }}
                  >
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
                  </div>
                )}
                {errorMessage && <p className="mt-2 text-sm text-error">{errorMessage}</p>}
              </div>
            ) : null}

            {fileType === 'pdf' ? (
              <PDFViewer
                pdfBase64={pdfBase64}
                translatedPageTextMap={translatedPageTextMap}
                isDark={isDark}
              />
            ) : null}

            {fileType === 'txt' ? (
              <pre className="mx-auto max-w-[800px] whitespace-pre-wrap rounded-md bg-bg px-6 py-6 font-mono text-base leading-8 text-textPrimary">
                {txtContent}
              </pre>
            ) : null}
          </div>
        )}
      </div>

      {missingSelectedLanguage && openFile.type === 'pgs' ? (
        <FallbackModal
          missingLanguage={selectedLanguage}
          availableLanguages={availableLanguages}
          onTranslateNow={onConvertToPgs}
          onSelectLanguage={onSelectLanguage}
          onViewOriginal={() => onSelectLanguage('original')}
          isDark={isDark}
        />
      ) : null}
    </section>
  );
}

export default Viewer;
