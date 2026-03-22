import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { defineI18nUI } from 'fumadocs-ui/i18n';
import { i18n } from '@/lib/i18n';
import type { ReactNode } from 'react';

const { provider } = defineI18nUI(i18n, {
  translations: {
    en: { displayName: 'English' },
    zh: { displayName: '中文' },
    de: { displayName: 'Deutsch' },
    fr: { displayName: 'Français' },
    es: { displayName: 'Español' },
    pl: { displayName: 'Polski' },
    it: { displayName: 'Italiano' },
    ko: { displayName: '한국어' },
    pt: { displayName: 'Português' },
    ja: { displayName: '日本語' },
  },
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <RootProvider
        theme={{
          enabled: true,
          enableSystem: true,
        }}
        i18n={provider(locale)}
      >
        {children}
      </RootProvider>
    </NextIntlClientProvider>
  );
}
