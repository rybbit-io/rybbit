import { Gauge } from "lucide-react";
import { useExtracted } from "next-intl";
import { Card } from "./Card";
import { DemoFrame } from "./DemoFrame";

// p75 values against the standard Web Vitals thresholds (client
// performance/utils). Gauge zones: good 0–55%, needs improvement 55–80%,
// poor 80–100% of the track; position = value scaled into its zone.
const METRICS = [
  { code: "LCP", name: "Largest Contentful Paint", value: "2.1 s", position: 46.2, rating: "good" },
  { code: "INP", name: "Interaction to Next Paint", value: "232 ms", position: 57.7, rating: "needs-improvement" },
  { code: "CLS", name: "Cumulative Layout Shift", value: "0.04", position: 22, rating: "good" },
  { code: "FCP", name: "First Contentful Paint", value: "1.4 s", position: 42.8, rating: "good" },
  { code: "TTFB", name: "Time to First Byte", value: "640 ms", position: 44, rating: "good" },
] as const;

const RATING_TEXT = {
  good: "text-emerald-700 dark:text-emerald-400",
  "needs-improvement": "text-amber-700 dark:text-amber-400",
} as const;

const RATING_DOT = {
  good: "bg-emerald-600 dark:bg-emerald-400",
  "needs-improvement": "bg-amber-600 dark:bg-amber-400",
} as const;

export function WebVitals() {
  const t = useExtracted();

  return (
    <Card
      title={t("Web Vitals")}
      description={t("Core Web Vitals from real visits. See where your pages feel slow by route, country, and device.")}
      icon={Gauge}
    >
      <DemoFrame label="web-vitals" right={<span className="font-mono">p75 · 30d</span>}>
        <div className="space-y-4 p-4">
          {METRICS.map((metric, index) => (
            <div key={metric.code}>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-xs font-medium text-neutral-900 dark:text-neutral-100">
                  {metric.code}
                </span>
                <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">{metric.name}</span>
                <span className={`ml-auto shrink-0 font-mono text-xs tabular-nums ${RATING_TEXT[metric.rating]}`}>
                  {metric.value}
                </span>
              </div>
              <div className="relative mt-1.5">
                <div className="flex h-1.5 overflow-hidden rounded-full">
                  <div className="w-[55%] bg-emerald-500/20 dark:bg-emerald-500/25" />
                  <div className="w-[25%] bg-amber-500/20 dark:bg-amber-500/25" />
                  <div className="w-[20%] bg-red-500/20 dark:bg-red-500/25" />
                </div>
                <span
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${metric.position}%` }}
                >
                  <span
                    className={`demo-marker block size-2.5 rounded-full border-2 border-white dark:border-neutral-950 ${RATING_DOT[metric.rating]}`}
                    style={{ animationDelay: `${index * 80}ms` }}
                  />
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-auto flex h-9 shrink-0 items-center justify-between border-t border-neutral-200 px-3 text-xs dark:border-neutral-800">
          <span className="text-neutral-500 dark:text-neutral-400">{t("Passing Core Web Vitals")}</span>
          <span className="font-mono font-medium tabular-nums text-emerald-700 dark:text-emerald-400">4 / 5</span>
        </div>
      </DemoFrame>
    </Card>
  );
}
