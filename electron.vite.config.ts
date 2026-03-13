import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { lingoCompilerPlugin } from '@lingo.dev/compiler/vite';
import lingoConfig from './lingo.config';
import path from 'node:path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/main',
      lib: {
        entry: 'src/main/main.ts',
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/preload',
      lib: {
        entry: 'src/main/preload.ts',
      },
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: 'preload.js',
        },
      },
    },
  },
 renderer: {
  root: 'src/renderer',
  publicDir: path.resolve(__dirname, 'public'), // keep as-is
  plugins: [lingoCompilerPlugin(lingoConfig), react()],
  build: {
    outDir: path.resolve(__dirname, 'out/renderer'),
  },
},
});
