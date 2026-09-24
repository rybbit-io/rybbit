import { ALL_BOT_PATTERNS, BotCategory, BotPurpose } from "./patterns.js";

export type { BotCategory, BotPurpose } from "./patterns.js";

export interface BotClassification {
  isBot: boolean;
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
const COMPILED_PATTERNS: ReadonlyArray<{
  regex: RegExp;
  category: BotCategory;
  pattern: string;
  name: string | null;
  operator: string | null;
  purpose: BotPurpose | null;
}> = ALL_BOT_PATTERNS.map(p => ({
  regex: new RegExp(p.pattern, "i"),
  category: p.category,
  pattern: p.pattern,
  name: p.name ?? null,
  operator: p.operator ?? null,
  purpose: p.purpose ?? null,
}));

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
  for (const { regex, category, pattern, name, operator, purpose } of COMPILED_PATTERNS) {
    if (regex.test(userAgent)) {
      return { isBot: true, category, matchedPattern: pattern, name, operator, purpose };
    }
  }
  // Combined regex matched but no individual pattern did — should be unreachable.
  return { isBot: true, category: "generic", matchedPattern: null, name: null, operator: null, purpose: null };
}

/**
 * Boolean-only convenience for the (rare) caller that doesn't care about category.
 */
export function isBotUA(userAgent: string | null | undefined): boolean {
  return classifyUA(userAgent).isBot;
}
