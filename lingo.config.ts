const SUPPORTED_LOCALES = ['en', 'fr', 'es', 'de', 'hi', 'ar', 'ja', 'zh', 'pt', 'it'] as const;

const lingoConfig = {
  sourceRoot: 'src/renderer',
  sourceLocale: 'en',
  targetLocales: SUPPORTED_LOCALES.filter((locale) => locale !== 'en'),
  models: 'lingo.dev',
  buildMode: (process.env.LINGO_BUILD_MODE ?? 'cache-only') as 'translate' | 'cache-only',
  dev: {
    usePseudotranslator: false,
  },
} as const;

export { SUPPORTED_LOCALES };
export default lingoConfig;
