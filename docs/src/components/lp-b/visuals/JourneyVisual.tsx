"use client";

import { Frame } from "@/components/lp-b/primitives";
import { cn } from "@/lib/utils";
import { useInView, useReducedMotion } from "motion/react";
import { useExtracted } from "next-intl";
import { useEffect, useRef, useState } from "react";

// Mini sankey, hand-laid on a 560×240 sheet at 0.25px per visitor. Node
// heights and ribbon slots are mutually consistent (out = Σ ribbons).
const NODE_W = 6;
const COL_A = 10;
const COL_B = 277;
const COL_C = 544;

function ribbon(x1: number, s0: number, s1: number, x2: number, t0: number, t1: number) {
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${s0} C ${mx} ${s0}, ${mx} ${t0}, ${x2} ${t0} L ${x2} ${t1} C ${mx} ${t1}, ${mx} ${s1}, ${x1} ${s1} Z`;
}

const NODES = [
  { x: COL_A, y: 28, h: 90, label: "/", count: "4,320" },
  { x: COL_A, y: 150, h: 50, label: "/blog", count: "2,400" },
  { x: COL_B, y: 36, h: 85, label: "/pricing", count: "4,080" },
  { x: COL_B, y: 152, h: 55, label: "/docs", count: "2,640" },
  { x: COL_C, y: 92, h: 38, label: "/signup", count: "1,800", conversion: true },
];

const A_EDGE = COL_A + NODE_W;
const B_EDGE = COL_B + NODE_W;

const RIBBONS = [
  { d: ribbon(A_EDGE, 28, 93, COL_B, 36, 101), opacity: 0.32, from: "/", to: "/pricing", count: 2600, share: 60 },
  { d: ribbon(A_EDGE, 93, 118, COL_B, 152, 177), opacity: 0.22, from: "/", to: "/docs", count: 1000, share: 23 },
  { d: ribbon(A_EDGE, 150, 170, COL_B, 101, 121), opacity: 0.2, from: "/blog", to: "/pricing", count: 800, share: 33 },
  { d: ribbon(A_EDGE, 170, 200, COL_B, 177, 207), opacity: 0.26, from: "/blog", to: "/docs", count: 1200, share: 50 },
  { d: ribbon(B_EDGE, 36, 63.5, COL_C, 92, 119.5), opacity: 0.3, from: "/pricing", to: "/signup", count: 1100, share: 27, conversion: true },
  { d: ribbon(B_EDGE, 152, 162, COL_C, 119.5, 129.5), opacity: 0.2, from: "/docs", to: "/signup", count: 400, share: 15, conversion: true },
];

// Center-lines of the two conversion ribbons, carrying the animated flow.
const FLOW_LINES = [
  `M ${B_EDGE} 49.75 C ${(B_EDGE + COL_C) / 2} 49.75, ${(B_EDGE + COL_C) / 2} 105.75, ${COL_C} 105.75`,
  `M ${B_EDGE} 157 C ${(B_EDGE + COL_C) / 2} 157, ${(B_EDGE + COL_C) / 2} 124.5, ${COL_C} 124.5`,
];

const CYCLE_MS = 2600;

/**
 * User journeys as a sankey. Ribbons draw in on first view, the conversion
 * paths carry a moving flow, and the inspector cycles through every path,
 * lifting it out of the diagram the way hovering does in the product.
 */
export function JourneyVisual() {
  const t = useExtracted();
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.4 });
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (!inView || reducedMotion) return;
    let n = 0;
    const interval = setInterval(() => {
      setActive(n % RIBBONS.length);
      n++;
    }, CYCLE_MS);
    return () => clearInterval(interval);
  }, [inView, reducedMotion]);

  const inspected = active === null ? null : RIBBONS[active];

  return (
    <div ref={rootRef}>
      <Frame label="journeys · entry → 2 steps" right={<span className="font-mono">{t("Last 7 days")}</span>}>
        <div className="relative">
          <div className="overflow-x-auto">
            <svg
              viewBox="0 0 560 240"
              className="h-auto w-full min-w-[480px] p-3 pb-1"
              role="img"
              aria-label={t("Sankey diagram of visitor paths from entry pages to signup")}
            >
              {RIBBONS.map((r, i) => (
                <path
                  key={r.d}
                  d={r.d}
                  fillOpacity={active === null ? r.opacity : active === i ? Math.min(0.9, r.opacity + 0.4) : 0.1}
                  className={cn(
                    "journey-ribbon transition-[fill-opacity] duration-500 motion-reduce:transition-none",
                    r.conversion ? "fill-emerald-600 dark:fill-emerald-500" : "fill-[var(--dataviz)]"
                  )}
                  style={{ animationDelay: `${i * 90}ms` }}
                />
              ))}
              {FLOW_LINES.map(d => (
                <path
                  key={d}
                  d={d}
                  fill="none"
                  strokeWidth={2}
                  strokeLinecap="round"
                  className="journey-flow stroke-emerald-600/50 motion-reduce:hidden dark:stroke-emerald-400/40"
                />
              ))}
              {NODES.map(node => {
                const atEnd = node.x === COL_C;
                const labelX = atEnd ? node.x - 8 : node.x + NODE_W + 8;
                const lit = inspected !== null && (inspected.from === node.label || inspected.to === node.label);
                return (
                  <g key={node.label} className="transition-opacity duration-500" opacity={inspected === null || lit ? 1 : 0.45}>
                    <rect
                      x={node.x}
                      y={node.y}
                      width={NODE_W}
                      height={node.h}
                      rx={2}
                      className={
                        node.conversion ? "fill-emerald-600 dark:fill-emerald-500" : "fill-neutral-400 dark:fill-neutral-600"
                      }
                    />
                    <text
                      x={labelX}
                      y={node.y + node.h / 2 + 4}
                      textAnchor={atEnd ? "end" : "start"}
                      fontSize={12}
                      className="font-mono fill-neutral-700 dark:fill-neutral-300"
                    >
                      {node.label}
                      <tspan dx={6} className="fill-neutral-500 dark:fill-neutral-500">
                        {node.count}
                      </tspan>
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {inspected && (
            <div
              key={active}
              className="console-rise pointer-events-none absolute right-3 top-3 flex items-center gap-2 rounded-md border border-neutral-200 bg-white/95 px-2.5 py-1.5 text-xs shadow-sm backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/95"
            >
              <span className={cn("size-1.5 rounded-full", inspected.conversion ? "bg-emerald-500" : "bg-[var(--dataviz)]")} />
              <span className="font-mono text-neutral-800 dark:text-neutral-200">
                {inspected.from} → {inspected.to}
              </span>
              <span className="font-mono tabular-nums text-neutral-500 dark:text-neutral-400">
                {inspected.count.toLocaleString("en-US")} · {inspected.share}%
              </span>
            </div>
          )}
        </div>
        <div className="mt-auto flex h-9 shrink-0 items-center justify-between border-t border-neutral-200 px-3 text-xs dark:border-neutral-800">
          <span className="text-neutral-500 dark:text-neutral-400">
            {t("Entries")} <span className="ml-1 font-mono text-neutral-700 dark:text-neutral-300">6,720</span>
          </span>
          <span className="text-neutral-500 dark:text-neutral-400">
            {t("Reached signup")}{" "}
            <span className="ml-1 font-mono font-medium text-emerald-700 dark:text-emerald-400">1,800 · 26.8%</span>
          </span>
        </div>
      </Frame>
    </div>
  );
}
