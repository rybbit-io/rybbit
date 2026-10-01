import { useExtracted } from "next-intl";
import { useMemo } from "react";
import { type AiPurposeKey, type BotFamilyKey } from "../../botsData";

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

/**
 * Rows written before bot identity shipped carry an empty purpose. Saying so is
 * more honest than folding them into a real category.
 */
export function formatBotPurpose(value: string) {
  return PURPOSE_LABELS[value] ?? (value ? value : "Unclassified");
}

/** Short names for the three AI purposes, as the chart, the legend and the operator table use them. */
export function useAiPurposeLabels(): Record<AiPurposeKey, string> {
  const t = useExtracted();
  return useMemo(
    () => ({
      training: t("Training"),
      search: t("Answer engine"),
      agent: t("Agent"),
    }),
    [t]
  );
}

/** What each AI purpose means for the site owner, for tooltips. */
export function useAiPurposeDescriptions(): Record<AiPurposeKey, string> {
  const t = useExtracted();
  return useMemo(
    () => ({
      training: t("Collecting pages to train a model. Does not send readers back."),
      search: t("Indexing pages so an assistant can cite them. Can send readers back."),
      agent: t("Someone asked an assistant to open this page, just now."),
    }),
    [t]
  );
}

/** Names for the families the all-bots chart stacks. */
export function useBotFamilyLabels(): Record<BotFamilyKey, string> {
  const t = useExtracted();
  return useMemo(
    () => ({
      ai: t("AI"),
      search: t("Search engines"),
      tools: t("SEO, previews and monitoring"),
      scripted: t("Scripted and headless"),
      unclassified: t("Unclassified"),
    }),
    [t]
  );
}
