/**
 * Homepage A/B experiment scaffold.
 *
 * No experiment is running right now (`HOME_EXPERIMENT` is null). To start
 * one, build the challenger as its own page under `(home)` (canonical → "/",
 * `robots: noindex` not needed: the proxy rewrite keeps the URL at "/") and
 * set `HOME_EXPERIMENT` to `{ id, variantPath }`. Everything else is wired:
 *
 * - `proxy.ts` splits new visitors 50/50 on their first request, remembers
 *   the arm in a cookie named after the experiment, and rewrites `/` to
 *   `variantPath` for the B arm (URL unchanged).
 * - `RybbitScript` puts the arm on the site's own tracking tag (`data-tag`,
 *   see /docs/tagging), so both arms can be compared in the dashboard with a
 *   Tag filter on every page, not just the homepage.
 * - Crawlers are never enrolled: they always get the control page, untagged.
 * - `/?variant=a` or `/?variant=b` forces an arm for anyone and re-pins the
 *   cookie, so the rest of the visit stays on it (for review).
 *
 * To end one, set `HOME_EXPERIMENT` back to null and delete the challenger;
 * add its cookie to `RETIRED_COOKIES` so lingering assignments are cleared.
 *
 * History: `homepage-v2` (Sep 2026, "B · Quiet Editorial") — control won.
 */
export interface HomeExperiment {
  /** Short slug. Names the cookie (`rybbit_exp_<id>`) and the tags (`<id>-a`, `<id>-b`). */
  id: string;
  /** Internal route that serves the challenger at `/`, e.g. "/lp/b". */
  variantPath: string;
}

// `as` rather than an annotation so the module keeps the union type instead of
// narrowing the constant to `null` everywhere it is read.
export const HOME_EXPERIMENT = null as HomeExperiment | null;

/** Cookies from finished experiments; the proxy deletes them when it sees one. Prune entries after ~90 days. */
export const RETIRED_COOKIES = ["rybbit_home_variant"]; // homepage-v2, ended Sep 2026

export type HomeVariant = "a" | "b";

export const HOME_VARIANT_MAX_AGE = 60 * 60 * 24 * 90; // 90 days
/** `/?variant=a|b` forces an arm (and re-pins the cookie), for review. */
export const HOME_VARIANT_PARAM = "variant";

export function homeVariantCookie(experiment: HomeExperiment): string {
  return `rybbit_exp_${experiment.id}`;
}

export function homeVariantTag(experiment: HomeExperiment, variant: HomeVariant): string {
  return `${experiment.id}-${variant}`;
}

export function isHomeVariant(value: unknown): value is HomeVariant {
  return value === "a" || value === "b";
}

const CRAWLER_UA =
  /bot|crawl|spider|slurp|lighthouse|pagespeed|headlesschrome|preview|facebookexternalhit|embedly|pinterest|whatsapp|telegram|discordbot|vkshare|w3c_validator|curl|wget/i;

export function isCrawler(userAgent: string | null | undefined): boolean {
  return !userAgent || CRAWLER_UA.test(userAgent);
}

/** Reads the experiment's arm from a `document.cookie` string. */
export function readHomeVariantCookie(cookie: string, experiment: HomeExperiment): HomeVariant | null {
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${homeVariantCookie(experiment)}=([ab])(?:;|$)`));
  return match && isHomeVariant(match[1]) ? match[1] : null;
}
