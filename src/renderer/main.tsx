import React from 'react';
import ReactDOM from 'react-dom/client';
import { LingoProvider } from '@lingo.dev/compiler/react';
import App from './App';
import '@fontsource/noto-sans-devanagari/400.css';
import '@fontsource/noto-sans-devanagari/500.css';
import '@fontsource/noto-sans-devanagari/600.css';
import './index.css';

if (window.location.protocol === 'file:') {
  const originalFetch = window.fetch.bind(window);

  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const toPatchedUrl = (url: string): string => {
      if (!url.startsWith('/translations/')) {
        return url;
      }
      return new URL(`.${url}`, window.location.href).toString();
    };

    if (typeof input === 'string') {
      return originalFetch(toPatchedUrl(input), init);
    }

    if (input instanceof URL) {
      return originalFetch(toPatchedUrl(input.toString()), init);
    }

    const patchedUrl = toPatchedUrl(input.url);
    if (patchedUrl !== input.url) {
      return originalFetch(new Request(patchedUrl, input), init);
    }

    return originalFetch(input, init);
  }) as typeof window.fetch;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LingoProvider>
      <App />
    </LingoProvider>
  </React.StrictMode>,
);
