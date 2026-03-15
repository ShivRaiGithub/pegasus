import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { PageTextMap } from '../types/pgs';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).href;

interface PDFViewerProps {
  pdfBase64: string;
  translatedPageTextMap?: PageTextMap[];
  isDark: boolean;
}

type PdfOverlayItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function normalizeTranslatedItemsForRendering(items: PdfOverlayItem[]): PdfOverlayItem[] {
  if (items.length === 0) {
    return [];
  }

  type Line = {
    items: PdfOverlayItem[];
    avgY: number;
    avgHeight: number;
  };

  const sorted = [...items].sort((a, b) => {
    const yDiff = Math.abs(a.y - b.y);
    if (yDiff > 2) {
      return a.y - b.y;
    }
    return a.x - b.x;
  });

  const lines: Line[] = [];

  for (const item of sorted) {
    let bestLineIndex = -1;
    let bestLineDiff = Number.POSITIVE_INFINITY;

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const diff = Math.abs(item.y - line.avgY);
      const tolerance = Math.max(2.5, Math.min(12, line.avgHeight * 0.8));

      if (diff <= tolerance && diff < bestLineDiff) {
        bestLineIndex = index;
        bestLineDiff = diff;
      }
    }

    if (bestLineIndex === -1) {
      lines.push({
        items: [item],
        avgY: item.y,
        avgHeight: item.height,
      });
      continue;
    }

    const bestLine = lines[bestLineIndex];
    bestLine.items.push(item);

    const totalItems = bestLine.items.length;
    bestLine.avgY = ((bestLine.avgY * (totalItems - 1)) + item.y) / totalItems;
    bestLine.avgHeight = ((bestLine.avgHeight * (totalItems - 1)) + item.height) / totalItems;
  }

  const merged = lines
    .map((line) => {
      const lineItems = [...line.items].sort((a, b) => a.x - b.x);
      const minX = Math.min(...lineItems.map((item) => item.x));
      const maxX = Math.max(...lineItems.map((item) => item.x + item.width));
      const minY = Math.min(...lineItems.map((item) => item.y));
      const maxHeight = Math.max(...lineItems.map((item) => item.height));

      let lineText = '';

      for (let index = 0; index < lineItems.length; index += 1) {
        const current = lineItems[index];
        const currentText = current.str.trim();

        if (!currentText) {
          continue;
        }

        if (index > 0) {
          const previous = lineItems[index - 1];
          const gap = current.x - (previous.x + previous.width);
          const gapThreshold = Math.max(1.5, previous.height * 0.18);

          if (gap > gapThreshold && !lineText.endsWith(' ') && !currentText.startsWith(' ')) {
            lineText += ' ';
          }
        }

        lineText += currentText;
      }

      return {
        str: lineText,
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxHeight,
      };
    })
    .filter((item) => item.str.length > 0)
    .sort((a, b) => {
      const yDiff = Math.abs(a.y - b.y);
      if (yDiff > 2) {
        return a.y - b.y;
      }
      return a.x - b.x;
    });

  return merged;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function fitFontSizeToWidth(
  context: CanvasRenderingContext2D,
  text: string,
  baseFontSize: number,
  availableWidth: number,
): number {
  const safeBase = Math.max(baseFontSize, 8);
  const safeWidth = Math.max(availableWidth, 24);

  context.font = `${safeBase}px sans-serif`;
  const measured = context.measureText(text).width;

  if (!Number.isFinite(measured) || measured <= 0 || measured <= safeWidth) {
    return safeBase;
  }

  const scaled = (safeBase * safeWidth) / measured;
  return Math.max(6.5, Math.min(safeBase, scaled));
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

              const overlayItems = normalizeTranslatedItemsForRendering(translatedPage.items);
              const measurementContext = document.createElement('canvas').getContext('2d');

              for (const item of overlayItems) {
                const leftPx = item.x * 1.5;
                const lineHeightPx = Math.max(item.height * 1.5, 10);
                const topPx = Math.max(0, item.y * 1.5 - lineHeightPx * 0.85);
                const widthFromSource = Math.max(item.width * 1.5, 24);
                const maxWidthToPageEdge = Math.max(24, canvas.width - leftPx - 6);
                const availableWidth = Math.max(widthFromSource, maxWidthToPageEdge);
                const baseFontSize = Math.max(lineHeightPx * 0.9, 9);
                const fittedFontSize = measurementContext
                  ? fitFontSizeToWidth(measurementContext, item.str, baseFontSize, availableWidth)
                  : baseFontSize;
                const maskHeight = Math.max(lineHeightPx * 1.6, fittedFontSize * 1.95);
                const maskTop = Math.max(0, topPx - fittedFontSize * 0.35);
                const textTop = Math.max(0, maskTop + (maskHeight - fittedFontSize) * 0.5 - 1);

                const mask = document.createElement('div');
                mask.style.position = 'absolute';
                mask.style.left = `${leftPx}px`;
                mask.style.top = `${maskTop}px`;
                mask.style.width = `${availableWidth}px`;
                mask.style.height = `${maskHeight}px`;
                mask.style.backgroundColor = '#ffffff';
                mask.style.zIndex = '1';
                overlay.appendChild(mask);

                const span = document.createElement('span');
                span.textContent = item.str;
                span.style.position = 'absolute';

                span.style.left = `${leftPx}px`;
                span.style.top = `${textTop}px`;
                span.style.width = `${availableWidth}px`;
                span.style.display = 'block';
                span.style.fontSize = `${fittedFontSize}px`;
                span.style.lineHeight = '1';
                span.style.color = '#000000';
                span.style.textDecoration = 'none';
                span.style.fontFamily = 'sans-serif';
                span.style.whiteSpace = 'nowrap';
                span.style.overflow = 'hidden';
                span.style.backgroundColor = 'transparent';
                span.style.padding = '0 1px';
                span.style.zIndex = '2';
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
