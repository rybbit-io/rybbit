import { source } from "@/lib/source";
import { createFromSource } from "fumadocs-core/search/server";

// Build the search index at build time and serve it as a static, CDN-cacheable
// file. The client (RootProvider `search.options.type = 'static'`) downloads it
// once and runs Orama in the browser, so there are no per-keystroke round-trips.
export const revalidate = false;

// The docs source declares 10 i18n languages but the docs themselves are
// English-only . Fumadocs' i18n fallback would otherwise index the full English
// content once per locale, producing a ~61MB index (10x duplication) that the
// static client has to download. Export this as a single non-i18n index: the
// static Orama client treats i18n keys as Orama language names, and `en` is not
// a supported Orama language key during hydration.
const englishOnlySource = {
  ...source,
  _i18n: undefined,
  getPages: () => source.getPages("en"),
};

export const { staticGET: GET } = createFromSource(englishOnlySource);
