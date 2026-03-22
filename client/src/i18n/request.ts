import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

const SUPPORTED_LOCALES = ["en", "de", "fr", "zh", "es", "pl", "it", "ko", "pt", "ja", "cs"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

function getLocaleFromAcceptLanguage(acceptLanguage: string): SupportedLocale {
  const languages = acceptLanguage
    .split(",")
    .map((part) => {
      const [lang, q] = part.trim().split(";q=");
      return { lang: lang.trim().split("-")[0].toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of languages) {
    if (isSupportedLocale(lang)) {
      return lang;
    }
  }

  return "en";
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  let locale: SupportedLocale = "en";

  // Priority 1: NEXT_LOCALE cookie (user's explicit choice)
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  if (cookieLocale && isSupportedLocale(cookieLocale)) {
    locale = cookieLocale;
  } else {
    // Priority 2: Accept-Language header (browser auto-detection)
    const acceptLanguage = headerStore.get("Accept-Language");
    if (acceptLanguage) {
      locale = getLocaleFromAcceptLanguage(acceptLanguage);
    }
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
