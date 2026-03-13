import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PageTextMap } from '../types/pgs';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;

interface PDFViewerProps {
  pdfBase64: string;
  translatedPageTextMap?: PageTextMap[];
  isDark: boolean;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function PDFViewer({ pdfBase64, translatedPageTextMap, isDark }: PDFViewerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderPdf = async () => {
      if (!rootRef.current || !pdfBase64) {
        return;
      }

      setIsRendering(true);
      setError(null);

      try {
        const data = base64ToUint8Array(pdfBase64);
        const loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;

        rootRef.current.innerHTML = '';

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.5 });

          const pageContainer = document.createElement('div');
          pageContainer.style.position = 'relative';
          pageContainer.style.display = 'inline-block';
          pageContainer.style.marginBottom = '18px';
          pageContainer.style.boxShadow = isDark ? '0 2px 16px rgba(0,0,0,0.35)' : '0 2px 10px rgba(0,0,0,0.2)';

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) {
            throw new Error('Canvas context is unavailable.');
          }

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.display = 'block';
          canvas.style.background = '#ffffff';

          await page.render({
            canvas,
            canvasContext: context,
            viewport,
          }).promise;

          pageContainer.appendChild(canvas);

          if (translatedPageTextMap && translatedPageTextMap.length > 0) {
            const translatedPage = translatedPageTextMap.find((entry) => entry.page === pageNumber);

            if (translatedPage) {
              const overlay = document.createElement('div');
              overlay.style.position = 'absolute';
              overlay.style.top = '0';
              overlay.style.left = '0';
              overlay.style.width = `${canvas.width}px`;
              overlay.style.height = `${canvas.height}px`;
              overlay.style.pointerEvents = 'none';

              for (const item of translatedPage.items) {
                const span = document.createElement('span');
                span.textContent = item.str;
                span.style.position = 'absolute';
                span.style.left = `${item.x * 1.5}px`;
                span.style.top = `${item.y * 1.5}px`;
                span.style.fontSize = `${Math.max(item.height * 1.5, 10)}px`;
                span.style.lineHeight = '1';
                span.style.color = '#000000';
                span.style.textDecoration = 'none';
                span.style.fontFamily = 'sans-serif';
                span.style.whiteSpace = 'nowrap';
                span.style.backgroundColor = '#ffffff';
                overlay.appendChild(span);
              }

              pageContainer.appendChild(overlay);
            }
          }

          rootRef.current.appendChild(pageContainer);
        }
      } catch (renderError) {
        const message = renderError instanceof Error ? renderError.message : 'Failed to render PDF.';
        setError(message);
      } finally {
        setIsRendering(false);
      }
    };

    void renderPdf();
  }, [isDark, pdfBase64, translatedPageTextMap]);

  if (translatedPageTextMap && translatedPageTextMap.length > 0) {
    console.log('First page items:', translatedPageTextMap[0]?.items.slice(0, 3));
  }

  return (
    <div style={{ position: 'relative' }}>
      <div className="pdf-container" ref={rootRef} />
      {isRendering && (
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
      {error && <p className="mt-2 text-sm text-error">{error}</p>}
    </div>
  );
}

export default PDFViewer;
