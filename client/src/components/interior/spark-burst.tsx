// Adapted from interior.dev "Like Burst" (MIT). See ./THIRD_PARTY_LICENSES.md
"use client";

import { motion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

const round = (value: number) => Math.round(value * 10) / 10;

// Fixed jitter per spark, so the burst looks hand-placed and is identical every time: nothing is
// random at render. It nudges each spark's angle, reach, size and start.
const JITTER = [0.55, 0.1, 0.8, 0.35, 0.95, 0.2, 0.65, 0.45];

const SPARKS = JITTER.map((jitter, i) => {
  const angle = (i / JITTER.length) * Math.PI * 2 - Math.PI / 2 + (jitter - 0.5) * 0.5;
  return {
    cos: Math.cos(angle),
    sin: Math.sin(angle),
    // Outer reach between 80% and 100% of the outer ellipse.
    reach: 0.8 + jitter * 0.2,
    size: 4 + Math.round(jitter * 2),
    delay: Math.round(jitter * 60) / 1000,
  };
});

// Alternates the success signal (emerald) with the data hue (periwinkle): the first data point landing.
const SPARK_TONES = ["bg-emerald-500 dark:bg-emerald-400", "bg-dataviz"];

const DURATION = 0.7;
// Sparks appear fast, hold full strength for most of the flight and only fade near the end.
const OPACITY_TIMES = [0, 0.12, 0.6, 1];

type Ellipse = { x: number; y: number };

/** Where each spark starts and lands, in px from the burst's centre, with its size and stagger. */
export function sparkFlights(inner: Ellipse, outer: Ellipse) {
  return SPARKS.map(spark => ({
    from: { x: round(spark.cos * inner.x), y: round(spark.sin * inner.y) },
    to: { x: round(spark.cos * outer.x * spark.reach), y: round(spark.sin * outer.y * spark.reach) },
    size: spark.size,
    delay: spark.delay,
  }));
}

export type SparkBurstProps = {
  /** Half-extents of the glyph the sparks surround, in px: they start just outside it, not on it. */
  inner?: Ellipse;
  /** Half-extents of where they land, in px. Keep it inside any clipping parent. */
  outer?: Ellipse;
  /** Seconds before the sparks leave, e.g. to let the glyph they surround land first. */
  delay?: number;
  className?: string;
};

/**
 * One small burst of eight 4–6px sparks from around the centre of its positioned parent. It plays once
 * on mount (remount it with a new `key` to play again) and is hidden entirely under
 * prefers-reduced-motion, where the transforms would be dropped and only a flash of dots would remain.
 */
export function SparkBurst({
  inner = { x: 12, y: 12 },
  outer = { x: 36, y: 36 },
  delay = 0,
  className,
}: SparkBurstProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none absolute left-1/2 top-1/2 block size-0 motion-reduce:hidden", className)}
    >
      {sparkFlights(inner, outer).map(({ from, to, size, delay: stagger }, index) => {
        const start = delay + stagger;
        return (
          <motion.span
            key={index}
            className={cn("absolute block rounded-[1px]", SPARK_TONES[index % SPARK_TONES.length])}
            style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}
            initial={{ x: from.x, y: from.y, opacity: 0, scale: 0.8 }}
            animate={{ x: to.x, y: to.y, opacity: [0, 1, 1, 0], scale: [0.8, 1, 1, 0.7] }}
            transition={{
              default: { duration: DURATION, delay: start, ease: EASE_OUT },
              opacity: { duration: DURATION, delay: start, times: OPACITY_TIMES, ease: "linear" },
              scale: { duration: DURATION, delay: start, times: OPACITY_TIMES, ease: "linear" },
            }}
          />
        );
      })}
    </span>
  );
}
