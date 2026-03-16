import { useEffect, useMemo, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import type { OpenFileState, PageTextMap } from '../types/pgs';
import FallbackModal from './FallbackModal';
import PDFViewer from './PDFViewer.tsx';
import { appAsset } from '../utils/assets';
import { BRAND_NAME } from '../utils/brand';

interface ViewerProps {
  openFile: OpenFileState;
  selectedLanguage: string;
  isDark: boolean;
  onConvertToPgs: () => void;
  onSelectLanguage: (lang: string) => void;
}

interface DocxTranslatedChunkPayload {
  kind: 'docx-chunks-v1';
  chunks: string[];
}

const languageNameMap: Record<string, string> = {
  original: 'Original',
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  de: 'German',
  hi: 'Hindi',
  ar: 'Arabic',
  ja: 'Japanese',
  zh: 'Chinese',
  pt: 'Portuguese',
  it: 'Italian',
};

const DEVANAGARI_FONT_FALLBACK =
  "'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', 'Kohinoor Devanagari', sans-serif";

function withHindiFallback(fontFamily?: string): string {
  if (!fontFamily || fontFamily.trim().length === 0) {
    return DEVANAGARI_FONT_FALLBACK;
  }

  if (fontFamily.toLowerCase().includes('noto sans devanagari')) {
    return fontFamily;
  }

  return `${fontFamily}, ${DEVANAGARI_FONT_FALLBACK}`;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);

  for (let index = 0; index < binaryStr.length; index += 1) {
    bytes[index] = binaryStr.charCodeAt(index);
  }

  return bytes.buffer;
}

function parseDocxTranslatedChunks(payload: string): string[] | null {
  if (!payload || payload.trim().length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(payload) as Partial<DocxTranslatedChunkPayload>;
    if (parsed.kind === 'docx-chunks-v1' && Array.isArray(parsed.chunks)) {
      return parsed.chunks.filter((item): item is string => typeof item === 'string');
    }
  } catch {
    return null;
  }

  return null;
}

function Viewer({ openFile, selectedLanguage, isDark, onConvertToPgs, onSelectLanguage }: ViewerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const docxOriginalLayerRef = useRef<HTMLDivElement | null>(null);
  const docxOverlayMeasureLayerRef = useRef<HTMLDivElement | null>(null);
  const docxTextOverlayLayerRef = useRef<HTMLDivElement | null>(null);

  const isPgs = openFile.type === 'pgs';
  const fileType = openFile.type === 'pgs' ? openFile.pgsData?.originalType : openFile.extractedContent?.metadata.type;
  const availableLanguages = openFile.pgsData?.availableLanguages ?? [];
  const missingSelectedLanguage = isPgs && !availableLanguages.includes(selectedLanguage);
  const passportLanguages = useMemo(() => {
    const unique = new Set(availableLanguages);
    const ordered = ['original', ...availableLanguages.filter((lang) => lang !== 'original')];
    return ordered.filter((lang) => unique.has(lang));
  }, [availableLanguages]);
  const languageCount = passportLanguages.filter((lang) => lang !== 'original').length;
  const createdAtLabel = useMemo(() => {
    if (!openFile.pgsData?.createdAt) {
      return 'Created recently';
    }
    const date = new Date(openFile.pgsData.createdAt);
    if (Number.isNaN(date.getTime())) {
      return 'Created recently';
    }
    return `Created ${date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;
  }, [openFile.pgsData?.createdAt]);

  const selectedPgsPayload = useMemo(() => {
    if (!isPgs || !openFile.pgsData || missingSelectedLanguage) {
      return '';
    }

    return openFile.pgsData.files[selectedLanguage] ?? '';
  }, [isPgs, missingSelectedLanguage, openFile.pgsData, selectedLanguage]);

  const docxTranslatedChunks = useMemo(() => {
    if (fileType !== 'docx' || openFile.type !== 'pgs' || selectedLanguage === 'original') {
      return null;
    }

    return parseDocxTranslatedChunks(selectedPgsPayload);
  }, [fileType, openFile.type, selectedLanguage, selectedPgsPayload]);

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

  const originalDocxBase64 = useMemo(() => {
    if (fileType !== 'docx') {
      return '';
    }

    if (openFile.type === 'pgs') {
      return openFile.pgsData?.files.original ?? '';
    }

    return regularBase64;
  }, [fileType, openFile.pgsData?.files.original, openFile.type, regularBase64]);

  const useDocxOverlayModel = useMemo(() => {
    return false;
  }, []);

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

  const renderDocxInto = async (base64: string, target: HTMLDivElement) => {
    target.innerHTML = '';
    const arrayBuffer = base64ToArrayBuffer(base64);

    await renderAsync(arrayBuffer, target, undefined, {
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
  };

  const clearDocxLayers = () => {
    if (docxOriginalLayerRef.current) {
      docxOriginalLayerRef.current.innerHTML = '';
    }

    if (docxOverlayMeasureLayerRef.current) {
      docxOverlayMeasureLayerRef.current.innerHTML = '';
    }

    if (docxTextOverlayLayerRef.current) {
      docxTextOverlayLayerRef.current.innerHTML = '';
    }
  };

  const collectTextNodes = (root: HTMLElement): Text[] => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];

    let current = walker.nextNode();
    while (current) {
      const textNode = current as Text;
      if (textNode.textContent && textNode.textContent.trim().length > 0) {
        nodes.push(textNode);
      }
      current = walker.nextNode();
    }

    return nodes;
  };

  const renderDocxTextOverlay = () => {
    const originalRoot = docxOriginalLayerRef.current;
    const translatedMeasureRoot = docxOverlayMeasureLayerRef.current;
    const overlayRoot = docxTextOverlayLayerRef.current;

    if (!originalRoot || !translatedMeasureRoot || !overlayRoot) {
      return;
    }

    overlayRoot.innerHTML = '';

    const originalNodes = collectTextNodes(originalRoot);
    const translatedNodes = collectTextNodes(translatedMeasureRoot);
    const pairCount = Math.min(originalNodes.length, translatedNodes.length);
    const originalBounds = originalRoot.getBoundingClientRect();

    overlayRoot.style.height = `${Math.max(originalRoot.scrollHeight, originalRoot.offsetHeight)}px`;

    for (let index = 0; index < pairCount; index += 1) {
      const sourceNode = originalNodes[index];
      const translatedNode = translatedNodes[index];
      const translatedText = translatedNode.textContent?.trim();

      if (!translatedText) {
        continue;
      }

      const range = document.createRange();
      range.setStart(sourceNode, 0);
      range.setEnd(sourceNode, sourceNode.length);

      const rect = range.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        continue;
      }

      const sourceElement = sourceNode.parentElement;
      const computedStyle = sourceElement ? window.getComputedStyle(sourceElement) : null;

      const span = document.createElement('span');
      span.textContent = translatedText;
      span.style.position = 'absolute';
      span.style.left = `${rect.left - originalBounds.left}px`;
      span.style.top = `${rect.top - originalBounds.top}px`;
      const maxOverlayWidth = Math.max(originalBounds.width - (rect.left - originalBounds.left) - 20, rect.width, 60);
      span.style.maxWidth = `${maxOverlayWidth}px`;
      span.style.minHeight = `${Math.max(rect.height, 12)}px`;
      span.style.display = 'inline-block';
      span.style.whiteSpace = 'pre-wrap';
      span.style.wordBreak = 'break-word';
      span.style.overflow = 'visible';
      span.style.background = '#ffffff';
      span.style.padding = '0 1px';
      span.style.pointerEvents = 'none';
      span.style.color = '#000000';

      if (computedStyle) {
        span.style.fontSize = computedStyle.fontSize;
        span.style.fontFamily = withHindiFallback(computedStyle.fontFamily);
        span.style.fontWeight = computedStyle.fontWeight;
        span.style.lineHeight = computedStyle.lineHeight;
        span.style.letterSpacing = computedStyle.letterSpacing;
      } else {
        span.style.fontFamily = DEVANAGARI_FONT_FALLBACK;
      }

      overlayRoot.appendChild(span);
    }
  };

  const renderDocx = async (base64: string) => {
    if (!docxOriginalLayerRef.current) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await renderDocxInto(base64, docxOriginalLayerRef.current);

      if (docxOverlayMeasureLayerRef.current) {
        docxOverlayMeasureLayerRef.current.innerHTML = '';
      }

      if (docxTextOverlayLayerRef.current) {
        docxTextOverlayLayerRef.current.innerHTML = '';
      }
    } catch (err) {
      console.error('docx-preview failed:', err);
      setErrorMessage('Failed to render document');
    } finally {
      setIsLoading(false);
    }
  };

  const renderDocxWithTranslatedChunks = async (base64: string, translatedChunks: string[]) => {
    if (!docxOriginalLayerRef.current) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await renderDocxInto(base64, docxOriginalLayerRef.current);

      const root = docxOriginalLayerRef.current;
      const blockNodes = Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, td, th, blockquote')).filter(
        (node) => (node.textContent?.trim().length ?? 0) > 0,
      );

      const replaceCount = Math.min(blockNodes.length, translatedChunks.length);

      for (let index = 0; index < replaceCount; index += 1) {
        const nextText = translatedChunks[index] ?? '';

        const textNodes = collectTextNodes(blockNodes[index]);
        if (textNodes.length === 0) {
          continue;
        }

        const source = textNodes[0].textContent ?? '';
        const leading = source.match(/^\s*/)?.[0] ?? '';
        const trailing = source.match(/\s*$/)?.[0] ?? '';
        textNodes[0].textContent = `${leading}${nextText}${trailing}`;

        for (let nodeIndex = 1; nodeIndex < textNodes.length; nodeIndex += 1) {
          textNodes[nodeIndex].textContent = '';
        }
      }

      if (docxOverlayMeasureLayerRef.current) {
        docxOverlayMeasureLayerRef.current.innerHTML = '';
      }

      if (docxTextOverlayLayerRef.current) {
        docxTextOverlayLayerRef.current.innerHTML = '';
      }
    } catch (err) {
      console.error('docx translated-chunks render failed:', err);
      setErrorMessage('Failed to render translated document');
    } finally {
      setIsLoading(false);
    }
  };

  const renderDocxOverlay = async (originalBase64: string, translatedBase64: string) => {
    if (!docxOriginalLayerRef.current || !docxOverlayMeasureLayerRef.current || !docxTextOverlayLayerRef.current) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await renderDocxInto(originalBase64, docxOriginalLayerRef.current);
      await renderDocxInto(translatedBase64, docxOverlayMeasureLayerRef.current);
      renderDocxTextOverlay();
    } catch (err) {
      console.error('docx overlay render failed:', err);
      setErrorMessage('Failed to render translated DOCX overlay');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!openFile) return;

    if (fileType !== 'docx') {
      clearDocxLayers();
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    if (useDocxOverlayModel) {
      const translatedBase64 = openFile.pgsData?.files[selectedLanguage] ?? '';

      if (originalDocxBase64 && translatedBase64) {
        void renderDocxOverlay(originalDocxBase64, translatedBase64);
      }

      return;
    }

    if (openFile.type === 'regular' && openFile.extractedContent?.fileBase64) {
      void renderDocx(openFile.extractedContent.fileBase64);
    } else if (openFile.type === 'pgs' && openFile.pgsData) {
      if (selectedLanguage === 'original') {
        const originalBase64 = openFile.pgsData.files['original'];
        if (originalBase64) {
          void renderDocx(originalBase64);
        }
        return;
      }

      if (docxTranslatedChunks && originalDocxBase64) {
        void renderDocxWithTranslatedChunks(originalDocxBase64, docxTranslatedChunks);
        return;
      }

      const legacyTranslatedBase64 = openFile.pgsData.files[selectedLanguage];
      if (legacyTranslatedBase64) {
        void renderDocx(legacyTranslatedBase64);
      }
    }
  }, [
    docxTranslatedChunks,
    fileType,
    openFile,
    originalDocxBase64,
    selectedLanguage,
    useDocxOverlayModel,
  ]);

  useEffect(() => {
    if (fileType !== 'docx') {
      clearDocxLayers();
      setIsLoading(false);
      setErrorMessage(null);
    }
  }, [fileType]);

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-12 pt-6">
      {openFile.type === 'regular' ? (
        <div className="-mx-6 mb-4 flex items-center justify-center border-b border-border bg-surface px-6 py-3">
          <button
            type="button"
            onClick={onConvertToPgs}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accentHover"
          >
            Create Language Passport
          </button>
        </div>
      ) : null}

      {openFile.type === 'pgs' ? (
        <div className="mb-4 space-y-3">
          <div className="rounded-xl border border-border bg-surface px-6 py-7 text-center shadow-sm">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accentLight">
              <img src={appAsset('/pegasusIcon.svg')} alt={`${BRAND_NAME} icon`} className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold text-textPrimary">{openFile.fileName}</h2>
            <p className="mt-1 text-xs text-textTertiary">.pgs Language Passport</p>
            <div className="mx-auto my-4 h-px w-24 bg-border" />
            <p className="text-sm text-textSecondary">
              {languageCount} languages · {createdAtLabel}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {passportLanguages.map((lang) => {
                const selected = selectedLanguage === lang;
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => onSelectLanguage(lang)}
                    className={`rounded-xl border px-4 py-4 text-center transition ${
                      selected
                        ? 'border-accent bg-accent text-white'
                        : 'border-border bg-white text-textPrimary hover:border-accent hover:bg-accentLight dark:bg-bg'
                    }`}
                  >
                    <p className="text-sm font-medium">{languageNameMap[lang] ?? lang.toUpperCase()}</p>
                    <p className={`mt-1 text-xs ${selected ? 'text-white/80' : 'text-textSecondary'}`}>
                      Open
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-900/50 dark:bg-sky-900/20 dark:text-sky-300">
            This file is a Language Passport. Select a language card to view translated content.
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-surface">
        {missingSelectedLanguage ? null : (
          <div className="min-h-[480px] p-6">
            {fileType === 'docx' ? (
              <div style={{ position: 'relative' }}>
                <div className="docx-container">
                  <div className="docx-layer docx-original-layer" ref={docxOriginalLayerRef} />
                  {useDocxOverlayModel ? (
                    <>
                      <div className="docx-layer docx-overlay-measure-layer" ref={docxOverlayMeasureLayerRef} />
                      <div className="docx-layer docx-text-overlay-layer" ref={docxTextOverlayLayerRef} />
                    </>
                  ) : null}
                </div>
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
              <pre className="mx-auto max-w-[800px] whitespace-pre-wrap rounded-md bg-bg px-6 py-6 text-base leading-8 text-textPrimary">
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
        />
      ) : null}
    </section>
  );
}

export default Viewer;
