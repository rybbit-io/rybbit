import { ALL_BOT_PATTERNS, BotCategory } from "./patterns.js";

export type { BotCategory } from "./patterns.js";

export interface BotClassification {
  isBot: boolean;
  category: BotCategory | null;
  matchedPattern: string | null;
}

const NON_BOT: BotClassification = { isBot: false, category: null, matchedPattern: null };

// Single combined regex for the fast "is this anything at all?" test.
// Mirrors what isbot does internally.
const COMBINED_REGEX = new RegExp(ALL_BOT_PATTERNS.map(p => p.pattern).join("|"), "i");

// Per-pattern compiled regexes for category lookup. Iterated in source order
// so first match wins — patterns are authored most-specific-first in patterns.ts.
const COMPILED_PATTERNS: ReadonlyArray<{ regex: RegExp; category: BotCategory; pattern: string }> =
  ALL_BOT_PATTERNS.map(p => ({
    regex: new RegExp(p.pattern, "i"),
    category: p.category,
    pattern: p.pattern,
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
  // Fast path: combined regex test. ~95% of legitimate traffic exits here.
  if (!COMBINED_REGEX.test(userAgent)) {
    return NON_BOT;
  }
  for (const { regex, category, pattern } of COMPILED_PATTERNS) {
    if (regex.test(userAgent)) {
      return { isBot: true, category, matchedPattern: pattern };
    }
  }
  // Combined regex matched but no individual pattern did — should be unreachable.
  return { isBot: true, category: "generic", matchedPattern: null };
}

/**
 * Boolean-only convenience for the (rare) caller that doesn't care about category.
 */
export function isBotUA(userAgent: string | null | undefined): boolean {
  return classifyUA(userAgent).isBot;
}
