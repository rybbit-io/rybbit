import type { BotPurpose } from "../../../../../api/analytics/endpoints";

/** Colors for the two halves of AI traffic, used by the chart and the legend. */
export const AI_AGENT_COLOR = "hsl(var(--dataviz))";
export const AI_CRAWLER_COLOR = "hsl(var(--amber-400))";

const PURPOSE_LABELS: Record<string, string> = {
  ai_training: "AI training crawler",
  ai_search: "AI answer engine",
  ai_agent: "AI agent",
  search: "Search engine",
  social_preview: "Link preview",
  seo: "SEO crawler",
  monitoring: "Monitoring",
  security: "Security scanner",
  scripted: "Scripted client",
  headless: "Headless browser",
};

const PURPOSE_DESCRIPTIONS: Record<string, string> = {
  ai_training: "Collecting pages to train a model. Does not send readers back.",
  ai_search: "Indexing pages so an assistant can cite them. Can send readers back.",
  ai_agent: "Someone asked an assistant to open this page, just now.",
};

/**
 * Rows written before bot identity shipped carry an empty purpose. Saying so is
 * more honest than folding them into a real category.
 */
export function formatBotPurpose(value: string) {
  return PURPOSE_LABELS[value] ?? (value ? value : "Unclassified");
}

export function describeBotPurpose(value: string) {
  return PURPOSE_DESCRIPTIONS[value as BotPurpose];
}

export const AI_PURPOSE_ORDER: BotPurpose[] = ["ai_agent", "ai_search", "ai_training"];
