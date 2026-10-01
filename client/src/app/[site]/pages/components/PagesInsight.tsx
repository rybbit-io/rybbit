"use client";

import { useExtracted } from "next-intl";
import { useGetPagesSummary } from "@/api/analytics/hooks/useGetPages";
import { InsightRow } from "@/components/site/InsightRow";
import { Button } from "@/components/ui/button";
import { percentDelta } from "@/lib/delta";
import { useComparisonEnabled } from "@/lib/store";
import { formatSection } from "./pageIdentity";
import { findOnlyLosingSection, LosingSection } from "./losingSection";

/**
 * One sentence, shown only when it is exactly true: a single section has fewer
 * views than in the comparison period while every other section held or grew.
 */
export function PagesInsight({ onShowSection }: { onShowSection: (section: LosingSection) => void }) {
  const t = useExtracted();
  const comparing = useComparisonEnabled();
  const current = useGetPagesSummary();
  const previous = useGetPagesSummary({ periodTime: "previous" });

  // Both answers must be for the periods on screen, not the ones before a change.
  if (!comparing || current.isPlaceholderData || previous.isPlaceholderData) return null;

  const losing = findOnlyLosingSection(current.data, previous.data);
  const change = losing && percentDelta(losing.pageviews, losing.previousPageviews);
  // A drop that rounds to 0.0% is not worth a sentence.
  if (!losing || change?.direction !== "down") return null;

  const section = formatSection(losing.section);

  return (
    <InsightRow
      action={
        losing.rank !== null && (
          <Button type="button" variant="ghost" size="xs" onClick={() => onShowSection(losing)}>
            {t("Show {section} pages", { section })}
          </Button>
        )
      }
    >
      {t.rich(
        "<name>{section}</name> is the only section losing traffic: {views} views, down {change} from {previous}.",
        {
          name: chunks => <span className="font-medium text-neutral-900 dark:text-neutral-50">{chunks}</span>,
          section,
          views: losing.pageviews.toLocaleString(),
          change: change.text,
          previous: losing.previousPageviews.toLocaleString(),
        }
      )}
    </InsightRow>
  );
}
