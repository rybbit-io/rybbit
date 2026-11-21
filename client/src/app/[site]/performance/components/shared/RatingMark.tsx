import { useExtracted } from "next-intl";
import { cn } from "@/lib/utils";
import { PerformanceMetric } from "../../performanceStore";
import { MetricRating, RATING_TEXT_CLASS } from "../../utils/performanceUtils";

export function useRatingLabels(): Record<MetricRating, string> {
  const t = useExtracted();
  return {
    good: t("Good"),
    needs_improvement: t("Needs improvement"),
    poor: t("Poor"),
  };
}

export function useMetricNames(): Record<PerformanceMetric, string> {
  const t = useExtracted();
  return {
    lcp: t("Largest Contentful Paint"),
    inp: t("Interaction to Next Paint"),
    cls: t("Cumulative Layout Shift"),
    fcp: t("First Contentful Paint"),
    ttfb: t("Time to First Byte"),
  };
}

/**
 * A rating as a mark that differs in shape as well as colour (circle, square,
 * triangle), so it reads without colour vision. Decorative by default: put the
 * rating in words next to it, or pass `label` when it stands alone.
 */
export function RatingMark({
  rating,
  label,
  className,
}: {
  rating: MetricRating;
  /** Accessible name, for a mark with no rating text beside it. */
  label?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 10 10"
      className={cn("h-2 w-2 shrink-0 fill-current", RATING_TEXT_CLASS[rating], className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {rating === "good" ? (
        <circle cx="5" cy="5" r="4.4" />
      ) : rating === "needs_improvement" ? (
        <rect x="1" y="1" width="8" height="8" rx="1.5" />
      ) : (
        <path d="M5 0.8 9.7 9.2H0.3Z" />
      )}
    </svg>
  );
}
