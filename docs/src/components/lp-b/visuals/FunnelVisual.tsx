"use client";

import { Frame } from "@/components/lp-b/primitives";
import { cn } from "@/lib/utils";
import { ArrowDown, Eye, TrendingUp, Zap } from "lucide-react";
import { useInView, useReducedMotion } from "motion/react";
import { useExtracted } from "next-intl";
import { useEffect, useRef, useState } from "react";

interface Step {
  label: string;
  kind: "page" | "event";
  base: number;
}
const STEPS: Step[] = [
  { label: "/pricing", kind: "page", base: 8412 },
  { label: "signup", kind: "event", base: 3268 },
  { label: "/verify", kind: "page", base: 2460 },
  { label: "checkout_complete", kind: "event", base: 925 },
];

const COUNT_UP_MS = 1400;
const LIVE_TICK_MS = 2600;
// Deterministic "new visitors arriving" increments, so SSR and client agree.
const LIVE_INCREMENTS = [
  [3, 1, 1, 0],
  [2, 1, 0, 0],
  [4, 2, 1, 1],
  [1, 0, 0, 0],
  [3, 1, 1, 0],
  [2, 2, 1, 1],
];

const format = (n: number) => n.toLocaleString("en-US");
const easeOut = (u: number) => 1 - Math.pow(1 - u, 3);

/**
 * A conversion funnel as the product draws it: page and event steps, bars
 * scaled to the first step, drop-off between steps. Counts count up when the
 * panel scrolls into view, then keep ticking as visitors arrive.
 */
export function FunnelVisual() {
  const t = useExtracted();
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { once: true, amount: 0.4 });
  const reducedMotion = useReducedMotion();
  const [counts, setCounts] = useState(() => STEPS.map(s => s.base));
  const [revealed, setRevealed] = useState(false);
  const [flash, setFlash] = useState<number[]>([]);

  // Count-up from zero on first view.
  useEffect(() => {
    if (!inView || reducedMotion) {
      if (inView) setRevealed(true);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const u = Math.min(1, (now - start) / COUNT_UP_MS);
      const eased = easeOut(u);
      setCounts(STEPS.map(s => Math.round(s.base * eased)));
      if (u < 1) raf = requestAnimationFrame(tick);
      else setRevealed(true);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reducedMotion]);

  // Live arrivals once the count-up has settled.
  useEffect(() => {
    if (!revealed || reducedMotion) return;
    let n = 0;
    const interval = setInterval(() => {
      const inc = LIVE_INCREMENTS[n % LIVE_INCREMENTS.length];
      n++;
      setCounts(prev => prev.map((c, i) => c + inc[i]));
      setFlash(inc.map((v, i) => (v > 0 ? i : -1)).filter(i => i >= 0));
      setTimeout(() => setFlash([]), 700);
    }, LIVE_TICK_MS);
    return () => clearInterval(interval);
  }, [revealed, reducedMotion]);

  const first = counts[0] || 1;
  const last = counts[counts.length - 1];
  const conversion = ((last / first) * 100).toFixed(1);

  return (
    <div ref={rootRef}>
      <Frame
        label="funnels · checkout"
        right={
          <span className="font-mono">{t("Last 30 days")}</span>
        }
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <div>
            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{t("Checkout funnel")}</div>
            <div className="mt-0.5 flex flex-wrap gap-1">
              {STEPS.map((step, index) => (
                <span
                  key={step.label}
                  className="rounded border border-neutral-200 bg-neutral-50 px-1.5 font-mono text-[10px] leading-4 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400"
                >
                  {index + 1} · {step.label}
                </span>
              ))}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{t("Conversion")}</div>
            <div className="font-mono text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
              {conversion}%
            </div>
          </div>
        </div>

        <div className="p-4">
          {STEPS.map((step, index) => {
            const Icon = step.kind === "page" ? Eye : Zap;
            const count = counts[index];
            const previous = index > 0 ? counts[index - 1] : null;
            const percent = (count / first) * 100;
            const isConversion = index === STEPS.length - 1;
            return (
              <div key={step.label}>
                {previous !== null && (
                  <div className="flex items-center gap-1 py-1.5 pl-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                    <ArrowDown className="size-3" aria-hidden="true" />
                    <span className="font-mono tabular-nums">
                      −{(((previous - count) / (previous || 1)) * 100).toFixed(1)}% · {format(previous - count)} {t("dropped")}
                    </span>
                  </div>
                )}
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 font-mono text-[10px] text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
                    {index + 1}
                  </span>
                  <Icon
                    size={13}
                    className={cn("shrink-0", step.kind === "page" ? "text-[var(--dataviz)]" : "text-amber-600 dark:text-amber-400")}
                    aria-hidden="true"
                  />
                  <span className="truncate font-mono text-xs text-neutral-800 dark:text-neutral-200">{step.label}</span>
                  <span
                    className={cn(
                      "ml-auto shrink-0 font-mono text-xs tabular-nums transition-colors duration-500",
                      flash.includes(index) ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-600 dark:text-neutral-300"
                    )}
                  >
                    {format(count)}
                  </span>
                  <span
                    className={cn(
                      "w-12 shrink-0 text-right font-mono text-xs font-medium tabular-nums",
                      isConversion ? "text-emerald-700 dark:text-emerald-400" : "text-neutral-700 dark:text-neutral-300"
                    )}
                  >
                    {percent.toFixed(index === 0 ? 0 : 1)}%
                  </span>
                </div>
                <div className="h-6 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800/60">
                  <div
                    className={cn(
                      "h-full rounded transition-[width] duration-700 ease-out motion-reduce:transition-none",
                      isConversion ? "bg-emerald-600 dark:bg-emerald-500" : "bg-[var(--dataviz)]"
                    )}
                    style={{ width: `${percent}%`, opacity: isConversion ? 1 : 1 - index * 0.18 }}
                  />
                </div>
              </div>
            );
          })}

          <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-3 text-xs dark:border-neutral-800">
            <span className="text-neutral-500 dark:text-neutral-400">{t("vs. previous 30 days")}</span>
            <span className="flex items-center gap-1 font-mono font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
              <TrendingUp className="size-3" aria-hidden="true" />
              +1.8 pts
            </span>
          </div>
        </div>
      </Frame>
    </div>
  );
}
