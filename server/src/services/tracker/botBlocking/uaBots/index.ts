import { ALL_BOT_PATTERNS, BotCategory, BotPurpose } from "./patterns.js";

export type { BotCategory, BotPurpose } from "./patterns.js";

export interface BotClassification {
  isBot: boolean;
  /**
   * The match is real but cannot convict on its own: an ordinary word from the
   * generic upstream list, found in a user agent that is otherwise an ordinary
   * browser and never names itself a crawler. See `isCleanBrowserUserAgent`.
   * Callers treat it like a generic hosting ASN — evidence to attach once
   * something else has convicted, never a reason to divert the hit.
   */
  supportingOnly: boolean;
  category: BotCategory | null;
  matchedPattern: string | null;
  /**
   * Human-readable identity, present only for the curated patterns. A match on
   * a generic upstream rule ("crawl", "spider") is a bot without a name, and
   * saying so is more useful than inventing one from the regex.
   */
  name: string | null;
  operator: string | null;
  purpose: BotPurpose | null;
}

const NON_BOT: BotClassification = {
  isBot: false,
  supportingOnly: false,
  category: null,
  matchedPattern: null,
  name: null,
  operator: null,
  purpose: null,
};

// classifyUA runs on every event (when bot blocking is enabled) and, for bot
// user-agents, scans every compiled pattern. User-agent strings repeat heavily,
// so memoize the classification in a bounded LRU-ish cache to keep the regex
// scan off the per-event hot path. Mirrors parseUserAgent in tracker/utils.ts.
const CLASSIFY_CACHE_MAX = 10_000;
const classifyCache = new Map<string, BotClassification>();

// Single combined regex for the fast "is this anything at all?" test.
// Mirrors what isbot does internally.
const COMBINED_REGEX = new RegExp(ALL_BOT_PATTERNS.map(p => p.pattern).join("|"), "i");

// Per-pattern compiled regexes for category lookup. Iterated in source order
// so first match wins — patterns are authored most-specific-first in patterns.ts.
interface CompiledPattern {
  regex: RegExp;
  category: BotCategory;
  pattern: string;
  name: string | null;
  operator: string | null;
  purpose: BotPurpose | null;
  /** See `AMBIGUOUS_ON_BROWSER`. */
  weakOnBrowser: boolean;
}

/**
 * Upstream substrings that are ordinary words or brand names. Against a
 * scripted client's short user agent they are good evidence; against a full
 * browser user agent they match whatever the embedding app chose to call
 * itself — a news reader, a download manager, a Google-branded WebView.
 *
 * The list is explicit rather than "every un-named generic pattern" so that
 * distinct product identifiers (`httrack`, `deusu/`) and the crawler words
 * (`bots?`, `crawl`, `spider`, `scrape`) keep convicting wherever they appear.
 * Entries are the vendored pattern strings verbatim; a test fails if a
 * re-vendor changes one, so an entry cannot silently stop applying.
 */
export const AMBIGUOUS_ON_BROWSER: ReadonlySet<string> = new Set([
  "(?:^|[^g])news(?!sapphire)",
  "(?<! (?:channel/|google/))google(?!(app|/google| pixel))",
  "\\.com\\b",
  "advisor",
  "agent\\b",
  "archive",
  "capture",
  "catch",
  "classifier",
  "cloudflare",
  "download",
  "feed",
  "grab",
  "library",
  "mail\\.ru/",
  "manager",
  "proxy",
  "retriever",
  "rss\\b",
  "server",
  "sogou",
  "tools",
  "torrent",
  "url",
]);

const COMPILED_PATTERNS: ReadonlyArray<CompiledPattern> = ALL_BOT_PATTERNS.map(p => ({
  regex: new RegExp(p.pattern, "i"),
  category: p.category,
  pattern: p.pattern,
  name: p.name ?? null,
  operator: p.operator ?? null,
  purpose: p.purpose ?? null,
  weakOnBrowser: p.name === undefined && AMBIGUOUS_ON_BROWSER.has(p.pattern),
}));

/**
 * A full browser user agent: the `Mozilla/5.0 (<platform>) <engine>/<n>` frame
 * every shipping browser and in-app WebView sends.
 */
const BROWSER_FRAME_PATTERN =
  /^Mozilla\/5\.0 \((?:iPhone|iPad|iPod|Linux; |Android |Macintosh; |Windows NT |X11; )[^)]*\) (?:AppleWebKit|Gecko)\/\d/;

/**
 * The structural ways a crawler says it is one: `(compatible; ...)`, a URL, a
 * contact address. Words are deliberately absent. Every crawler word already
 * has its own pattern, which convicts on its own whatever this says, and a word
 * tested here as a bare substring reads handset names as confessions — a
 * "CUBOT" phone is not a bot, and upstream's own `bot` pattern knows it.
 */
const SELF_IDENTIFIED_PATTERN = /\bcompatible\b|:\/\/|www\.|@/i;

/**
 * Whether a user agent is an ordinary browser that does not identify as a
 * crawler anywhere in the string.
 *
 * In-app browsers append the host app's name to a real WebView user agent, and
 * the generic upstream substrings convict on that name: a news app's readers
 * matched "news" and an ad network's whole paid campaign (38k phones on mobile
 * carriers, sending web vitals) was diverted on the user-agent layer alone,
 * with nothing else agreeing. The app's name is not evidence about the visitor.
 */
function isCleanBrowserUserAgent(userAgent: string): boolean {
  return BROWSER_FRAME_PATTERN.test(userAgent) && !SELF_IDENTIFIED_PATTERN.test(userAgent);
}

/**
 * Classify a user-agent string. Returns the first matching bot pattern, or
 * a NON_BOT result if none match.
 *
 * Drop-in replacement for `isbot()` but additionally exposes the category
 * and the matched pattern source — useful for policy and metrics.
 */
export function classifyUA(userAgent: string | null | undefined): BotClassification {
  if (typeof userAgent !== "string" || userAgent.length === 0) {
    return NON_BOT;
  }

  const cached = classifyCache.get(userAgent);
  if (cached) {
    // Refresh recency so frequently-seen UAs survive eviction.
    classifyCache.delete(userAgent);
    classifyCache.set(userAgent, cached);
    return cached;
  }

  const result = computeClassification(userAgent);
  classifyCache.set(userAgent, result);
  if (classifyCache.size > CLASSIFY_CACHE_MAX) {
    const oldest = classifyCache.keys().next().value;
    if (oldest !== undefined) classifyCache.delete(oldest);
  }
  return result;
}

function computeClassification(userAgent: string): BotClassification {
  // Fast path: combined regex test. ~95% of legitimate traffic exits here.
  if (!COMBINED_REGEX.test(userAgent)) {
    return NON_BOT;
  }
  // On a clean browser user agent a weak pattern is held back rather than
  // returned, so a later, specific pattern still convicts if one matches —
  // first-match order alone would let "news" hide a "headlesschrome" behind it.
  const cleanBrowser = isCleanBrowserUserAgent(userAgent);
  let weakMatch: CompiledPattern | null = null;
  for (const compiled of COMPILED_PATTERNS) {
    if (!compiled.regex.test(userAgent)) continue;
    if (cleanBrowser && compiled.weakOnBrowser) {
      weakMatch ??= compiled;
      continue;
    }
    return toClassification(compiled, false);
  }
  if (weakMatch) {
    return toClassification(weakMatch, true);
  }
  // Combined regex matched but no individual pattern did — should be unreachable.
  return {
    isBot: true,
    supportingOnly: false,
    category: "generic",
    matchedPattern: null,
    name: null,
    operator: null,
    purpose: null,
  };
}

function toClassification(compiled: CompiledPattern, supportingOnly: boolean): BotClassification {
  return {
    isBot: true,
    supportingOnly,
    category: compiled.category,
    matchedPattern: compiled.pattern,
    name: compiled.name,
    operator: compiled.operator,
    purpose: compiled.purpose,
  };
}

/**
 * Boolean-only convenience for the (rare) caller that doesn't care about
 * category: whether the user agent convicts on its own.
 */
export function isBotUA(userAgent: string | null | undefined): boolean {
  const classification = classifyUA(userAgent);
  return classification.isBot && !classification.supportingOnly;
}
