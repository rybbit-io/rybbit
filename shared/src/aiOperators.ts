/**
 * AI operators, and the referrer domains that belong to each.
 *
 * This is the join key between the two halves of a site's AI story, which are
 * collected by completely different code paths and would otherwise never meet:
 *
 * - **Crawls** — `bot_events.bot_operator`, written during bot detection from
 *   the curated user-agent patterns.
 * - **Referrals** — `events` rows whose `channel` is `"AI"`, classified from the
 *   referrer domain.
 *
 * Put next to each other they answer the question a site owner actually has —
 * "this company read 4,000 of my pages; did it send anyone back?" — so both
 * sides have to spell an operator's name identically. That is why the mapping
 * lives here rather than being written out twice.
 *
 * The `operator` values must match the `operator` field on the curated bot
 * patterns in `server/src/services/tracker/botBlocking/uaBots/patterns.ts`.
 */
export const AI_OPERATOR_REFERRER_DOMAINS: Record<string, string[]> = {
  OpenAI: ["chatgpt.com", "chat.openai.com"],
  Anthropic: ["claude.ai"],
  Google: ["gemini.google.com"],
  Microsoft: ["copilot.microsoft.com"],
  Perplexity: ["perplexity.ai"],
  Meta: ["meta.ai"],
  Mistral: ["chat.mistral.ai", "mistral.ai"],
  xAI: ["grok.com"],
  "You.com": ["you.com"],
  // DuckDuckGo is deliberately absent: DuckAssistBot crawls, but a referral
  // from duckduckgo.com is organic search, not an AI chat hand-off, and
  // listing it here would reclassify every DuckDuckGo visit as AI traffic.
  Cursor: ["cursor.com"],
  Cohere: ["coral.cohere.com"],
};

/**
 * Referrer domain → operator, flattened. Lookups are by the domain form the
 * events table stores (`domainWithoutWWW(referrer)`).
 */
export const AI_REFERRER_DOMAIN_TO_OPERATOR: Record<string, string> = Object.fromEntries(
  Object.entries(AI_OPERATOR_REFERRER_DOMAINS).flatMap(([operator, domains]) =>
    domains.map(domain => [domain, operator] as const)
  )
);

/**
 * AI chat domains that have no crawler counterpart in the bot patterns. They
 * still belong to the AI acquisition channel — someone arrived from them — but
 * there is no operator to attribute crawls to, so they are kept apart from the
 * mapping above rather than given a made-up operator name.
 */
export const AI_CHAT_ONLY_DOMAINS: string[] = [
  "deepseek.com",
  "chat.deepseek.com",
  "poe.com",
  "pi.ai",
  "heypi.com",
  "character.ai",
  "qwen.ai",
  "jasper.ai",
  "writesonic.com",
  "chatsonic.com",
  "phind.com",
  "andi.com",
  "codeium.com",
];

/** Every domain that counts as AI chat traffic, for channel classification. */
export const AI_CHAT_DOMAINS: string[] = [
  ...Object.keys(AI_REFERRER_DOMAIN_TO_OPERATOR),
  ...AI_CHAT_ONLY_DOMAINS,
];
