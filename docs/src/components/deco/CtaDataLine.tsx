"use client";

import { cn } from "@/lib/utils";
import { useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

// A gentler sibling of the hero's momentum walk: a steady grind upward for
// the closing plate. Same sampled-jagged voice, emerald ink.
const LINE_PATH =
  "M-8 168 L30 166 L58 168 L92 150 L128 154 L166 128 L204 132 L238 110 L276 116 L310 92 L348 96 L386 70 L424 78 L458 54 L500 60 L536 38 L572 44 L610 26 L648 32 L688 18 L724 22 L784 12";

/**
 * The CTA plate's closing data line: the page opens with the hero's
 * periwinkle line drawing itself and ends with this emerald one. Draws once
 * when scrolled into view; resting state (SSR, no JS, reduced motion) is the
 * fully drawn line.
 */
export function CtaDataLine({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const isInView = useInView(rootRef, { once: true, amount: 0.6 });
  const animate = isInView && !prefersReducedMotion;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 [mask-image:linear-gradient(to_right,transparent,black_30%)]",
        className
      )}
    >
      <svg className="size-full" viewBox="0 0 800 200" preserveAspectRatio="none" fill="none">
        <defs>
          <linearGradient id="cta-dataline-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#34d399" stopOpacity="0.13" />
            <stop offset="1" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          className={animate ? "dataline-area" : undefined}
          d={`${LINE_PATH} L784 200 L-8 200 Z`}
          fill="url(#cta-dataline-fill)"
        />
        <path
          className={animate ? "dataline-path" : undefined}
          d={LINE_PATH}
          pathLength={1}
          stroke="#34d399"
          strokeOpacity="0.75"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {/* Endpoint marker at (784, 12) in the 800x200 viewBox */}
      <span
        className={cn(
          "absolute left-[98%] top-[6%] flex size-2 -translate-x-1/2 -translate-y-1/2",
          animate && "dataline-dot"
        )}
      >
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-50 [animation-duration:2.4s] motion-reduce:hidden" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
      </span>
    </div>
  );
}
