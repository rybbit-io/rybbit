"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useExtracted } from "next-intl";
import { DeltaTone, DeltaValue, deltaTone } from "@/lib/delta";
import { cn } from "@/lib/utils";

const TONE_CLASS: Record<DeltaTone, string> = {
  good: "text-emerald-600 dark:text-emerald-400",
  bad: "text-red-600 dark:text-red-400",
  neutral: "text-neutral-500 dark:text-neutral-400",
};

export interface DeltaProps {
  /** From `percentDelta` or `pointDelta` (lib/delta). Null draws nothing. */
  value: DeltaValue | null | undefined;
  /** False for metrics where a rise is bad news: bounce rate, load time, errors. */
  upIsGood?: boolean;
  className?: string;
}

/**
 * Change against the comparison period: an arrow, the magnitude, and a colour
 * that says whether the move is good. Renders nothing without a value, so a
 * page can pass the previous period straight through and lose its deltas when
 * the comparison is turned off.
 */
export function Delta({ value, upIsGood = true, className }: DeltaProps) {
  const t = useExtracted();
  if (!value) return null;

  const { direction } = value;
  const classes = cn(
    "inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-xs font-medium tabular-nums",
    TONE_CLASS[deltaTone(direction, upIsGood)],
    className
  );

  if (direction === "none") {
    const label = t("No data in the comparison period");
    return (
      <span className={classes} title={label}>
        <span aria-hidden="true">{value.text}</span>
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  const Icon = direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : Minus;

  // The arrow carries the sign for sighted readers; assistive tech gets the
  // signed figure instead of an unlabelled icon.
  return (
    <span className={classes}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span aria-hidden="true">{value.text}</span>
      <span className="sr-only">{value.signed}</span>
    </span>
  );
}
