/**
 * Homepage redesign experiment ("B · Quiet Editorial").
 *
 * Visitors are split 50/50 in `proxy.ts` on their first page request and
 * remembered in a cookie. Variant B visitors have `/` rewritten to
 * `HOME_VARIANT_B_PATH` (URL unchanged). Every visitor's Rybbit script tag
 * carries the matching `data-tag` (see `RybbitScript`), so both arms can be
 * compared in the dashboard with a Tag filter — see /docs/tagging.
 *
 * Crawlers are never enrolled: they always get the control page, untagged.
 */
export type HomeVariant = "a" | "b";

export const HOME_VARIANT_COOKIE = "rybbit_home_variant";
export const HOME_VARIANT_MAX_AGE = 60 * 60 * 24 * 90; // 90 days
export const HOME_VARIANT_B_PATH = "/lp/b";

export const HOME_VARIANT_TAG: Record<HomeVariant, string> = {
  a: "homepage-v2-a",
  b: "homepage-v2-b",
};

export function isHomeVariant(value: unknown): value is HomeVariant {
  return value === "a" || value === "b";
}

const CRAWLER_UA =
  /bot|crawl|spider|slurp|lighthouse|pagespeed|headlesschrome|preview|facebookexternalhit|embedly|pinterest|whatsapp|telegram|discordbot|vkshare|w3c_validator|curl|wget/i;

export function isCrawler(userAgent: string | null | undefined): boolean {
  return !userAgent || CRAWLER_UA.test(userAgent);
}

/** Reads the variant from a `document.cookie` string. */
export function readHomeVariantCookie(cookie: string): HomeVariant | null {
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${HOME_VARIANT_COOKIE}=([ab])(?:;|$)`));
  return match && isHomeVariant(match[1]) ? match[1] : null;
}
