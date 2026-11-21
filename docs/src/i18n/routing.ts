import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'de', 'fr', 'zh', 'es', 'pl', 'it', 'ko', 'pt', 'ja'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
});
