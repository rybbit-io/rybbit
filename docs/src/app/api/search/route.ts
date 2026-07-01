import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

// Build the search index at build time and serve it as a static, CDN-cacheable
// file. The client (RootProvider `search.options.type = 'static'`) downloads it
// once and runs Orama in the browser, so there are no per-keystroke round-trips.
export const revalidate = false;

// The docs source declares 10 i18n languages but the docs themselves are
// English-only — Fumadocs' i18n fallback would otherwise index the full English
// content once per locale, producing a ~61MB index (10x duplication) that the
// static client has to download. We restrict search to a single English index:
// the `en` locale matches directly, and the static client falls back to it for
// every other locale, so search returns the (English) docs on every page.
const englishOnlySource = {
  ...source,
  _i18n: { ...source._i18n, languages: ['en'], defaultLanguage: 'en' },
  getPages: () => source.getPages('en'),
};

export const { staticGET: GET } = createFromSource(englishOnlySource);
