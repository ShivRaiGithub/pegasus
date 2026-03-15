# Pegasus

Pegasus is an Electron desktop app for viewing and translating documents into multilingual `.pgs` Language Passport files.

## Highlights

- Open `DOCX`, `PDF`, and `TXT` files
- Translate into multiple languages in one run
- Save translations in `.pgs` format for fast reopen/switch
- View `.pgs` content by language (including original)
- Dark/light UI theme
- Localized UI via Lingo.dev Compiler

## Tech Stack

- Electron + React + TypeScript
- `electron-vite` build pipeline
- Tailwind CSS
- Lingo.dev Compiler (`@lingo.dev/compiler`)
- Lingo SDK runtime translation (`@lingo.dev/_sdk`)
- `docx-preview` (DOCX view), `pdfjs-dist` legacy renderer (PDF view)

## How Pegasus Works

1. User opens a source file (`DOCX`, `PDF`, `TXT`) or existing `.pgs`
2. Main process extracts chunked text + structure metadata
3. Selected languages are translated chunk-by-chunk
4. Content is reconstructed and saved into a `.pgs` package
5. Renderer displays translated content by selected language


## Project Structure

```text
src/
  main/
    main.ts                  # Electron main process + IPC handlers
    preload.ts               # Secure renderer bridge (window.electronAPI)
    services/
      fileExtractor.ts       # Reads DOCX/PDF/TXT into chunks + metadata
      translator.ts          # Calls Lingo engine for chunk translation
      fileReconstructor.ts   # Rebuilds translated outputs
      pgsManager.ts          # Read/write .pgs package files
  renderer/
    App.tsx                  # App shell + navigation
    components/              # Home, Viewer, ConvertFlow, Settings
    lingo/                   # Compiler cache/metadata artifacts
public/
  translations/              # Generated UI locale files
```

## Prerequisites

- Node.js 20+ (recommended)
- npm 10+

For UI translation generation (`LINGO_BUILD_MODE=translate`), configure your Lingo compiler API key in environment variables as required by your Lingo.dev setup.

## Setup

```bash
npm install
```

## Scripts

```bash
# Start Electron app in dev mode
npm run dev

# Build main + preload + renderer (default cache-only localization build)
npm run build

# Preview built app
npm run start
```

## Localization Workflow (Lingo.dev)

Pegasus uses Lingo Compiler in the renderer build.

- Source locale: `en`
- Target locales: `fr`, `es`, `de`, `hi`, `ar`, `ja`, `zh`, `pt`, `it`
- Config: `lingo.config.ts`

Build modes:

```bash
# Fast build using existing cache
npm run build

# Force translation generation and update public/translations/*.json
LINGO_BUILD_MODE=translate npm run build
```

### Important extraction rule

For Lingo Compiler extraction, user-visible text should be written directly in JSX text nodes.

✅ Extractable:

```tsx
<button>Next →</button>
<p>No recent files yet</p>
```

❌ Not reliably extractable:

```tsx
{someHelper('Next →')}
{condition ? 'A' : 'B'}
```

Prefer conditional JSX blocks instead of string ternaries when the text is translatable.

## `.pgs` Format Notes

- Version currently supported: `1.1`
- Stores:
  - original file payload (`original`)
  - translated payloads keyed by locale (`fr`, `es`, etc.)
  - metadata (`originalType`, `storageFormat`, `createdAt`, `availableLanguages`)

## Troubleshooting

- **Hindi glyphs show as boxes**  
  Ensure dependencies are installed and app rebuilt. Pegasus bundles `@fontsource/noto-sans-devanagari` for reliable Devanagari rendering.

- **Some UI text not translated**  
  Ensure text is directly in JSX and rerun:
  `LINGO_BUILD_MODE=translate npm run build`

- **Preload bridge missing error**  
  Restart the app and make sure `src/main/preload.ts` is built correctly via `npm run build`.
