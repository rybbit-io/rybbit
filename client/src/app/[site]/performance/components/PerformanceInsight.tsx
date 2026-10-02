"use client";

import { ArrowRight } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { InsightRow } from "@/components/site/InsightRow";
import { Button } from "@/components/ui/button";
import { usePivotHref } from "@/hooks/usePivotHref";
import { usePerformanceStore } from "../performanceStore";
import { findOnlyPoorRow, formatMetric, getRatingSplit, METRIC_LABELS_SHORT } from "../utils/performanceUtils";
import { usePerformanceRows } from "../utils/usePerformanceRows";

// A p75 over a handful of loads says little about a page.
const MIN_LOADS = 20;

/**
 * One sentence, only when it is plainly true of the numbers on the page:
 * among the pages with the most loads, exactly one is rated poor on the
 * selected metric at p75, the percentile Core Web Vitals are assessed at.
 * Nothing is inferred; with no such page, or several, the row is not drawn.
 *
 * It reads the same request as the Pages tab in its default state, so it adds
 * no query of its own.
 */
export function PerformanceInsight() {
  const t = useExtracted();
  const pivotHref = usePivotHref();
  const metric = usePerformanceStore(state => state.selectedPerformanceMetric);
  const { rows, previousByValue } = usePerformanceRows({ dimension: "pathname" });

  const busiest = rows.filter(row => (getRatingSplit(row, metric)?.count ?? 0) >= MIN_LOADS);
  const poor = findOnlyPoorRow(busiest, metric, row => row[`${metric}_p75`]);
  const current = poor?.[`${metric}_p75`];
  if (!poor || typeof current !== "number") return null;

  const page = String(poor.pathname);
  const previous = previousByValue.get(page)?.[`${metric}_p75`];
  const values = { metric: METRIC_LABELS_SHORT[metric], page, current: formatMetric(metric, current) };

  return (
    <InsightRow
      action={
        <Button asChild variant="ghost" size="xs" className="shrink-0 gap-1">
          <Link href={pivotHref("sessions", [{ parameter: "pathname", type: "equals", value: [page] }])}>
            {t("View sessions")}
            <ArrowRight />
          </Link>
        </Button>
      }
    >
      {typeof previous === "number" && formatMetric(metric, previous) !== values.current
        ? t("{metric} on {page} went from {previous} to {current} at p75.", {
            ...values,
            previous: formatMetric(metric, previous),
          })
        : t("{metric} on {page} is {current} at p75.", values)}{" "}
      {t("It is the only one of the {count} pages with the most loads rated poor.", {
        count: String(busiest.length),
      })}
    </InsightRow>
  );
}
