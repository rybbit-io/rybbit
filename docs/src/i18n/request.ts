import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import { withEnglishFallback } from "./messages";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    messages: withEnglishFallback(
      (await import("../../messages/en.json")).default,
      (await import(`../../messages/${locale}.json`)).default
    ),
  };
});
