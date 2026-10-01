"use client";

import { Info } from "lucide-react";
import { useExtracted } from "next-intl";
import { type ReactNode } from "react";
import { useGetBotOverview } from "../../../../api/analytics/hooks/bots/useGetBotOverview";
import { InsightRow } from "../../../../components/site/InsightRow";
import { Button } from "../../../../components/ui/button";
import { formatPercentChange } from "../../../../lib/delta";
import { useStore } from "../../../../lib/store";
import { unnamedGrowth } from "../botsData";
import { useBotsStore } from "../botsStore";

/**
 * A site with blocking off used to get an empty page here. It now gets what
 * was detected, which is a different thing from what was blocked, so the page
 * says which one it is showing.
 */
export function BlockingOffNotice() {
  const t = useExtracted();
  const site = useStore(state => state.site);
  const { data: overview } = useGetBotOverview({ site });

  if (!overview || overview.blocking) return null;

  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-neutral-100 bg-white px-3 py-2 text-sm text-neutral-700 dark:border-neutral-850 dark:bg-neutral-900 dark:text-neutral-200">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
      <p className="min-w-0">
        {t(
          "Bot blocking is off for this site. These are the bots Rybbit detected but did not block, so they are still counted in your analytics. Detections are kept for 30 days."
        )}
      </p>
    </div>
  );
}

/**
 * One sentence, and only when the numbers on the page make it true: unnamed
 * automation grew, and grew faster than the bots with a name. The rule and its
 * thresholds are in `unnamedGrowth`.
 */
export function UnnamedAutomationInsight() {
  const t = useExtracted();
  const site = useStore(state => state.site);
  const lens = useBotsStore(state => state.lens);
  const setLens = useBotsStore(state => state.setLens);
  const { data: overview } = useGetBotOverview({ site });
  const { data: previous } = useGetBotOverview({ site, periodTime: "previous" });

  const growth = unnamedGrowth(overview, previous);
  if (!growth) return null;

  const strong = (chunks: ReactNode) => (
    <span className="font-medium tabular-nums text-neutral-900 dark:text-neutral-50">{chunks}</span>
  );
  const change = formatPercentChange(growth.change).replace(/^\+/, "");

  return (
    <InsightRow
      action={
        lens === "ai" ? (
          <Button variant="ghost" size="xs" onClick={() => setLens("all")}>
            {t("View in All bots")}
          </Button>
        ) : undefined
      }
    >
      {growth.namedChange === null
        ? t.rich(
            "Unnamed automation grew <b>{change}</b>: {current, number} requests that no known bot accounts for, up from {previous, number}.",
            { change, current: growth.current, previous: growth.previous, b: strong }
          )
        : t.rich(
            "Unnamed automation grew <b>{change}</b>: {current, number} requests that no known bot accounts for, up from {previous, number}. Named bots changed by {namedChange}.",
            {
              change,
              current: growth.current,
              previous: growth.previous,
              namedChange: formatPercentChange(growth.namedChange),
              b: strong,
            }
          )}
    </InsightRow>
  );
}
