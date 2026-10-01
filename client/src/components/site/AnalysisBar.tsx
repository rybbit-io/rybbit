"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CompareControl } from "./CompareControl";

export interface AnalysisBarProps {
  /**
   * The compare control. Defaults to `<CompareControl />`; pass `null` on a
   * page with nothing to compare.
   */
  compare?: ReactNode;
  /** The breakdown control, usually a `<BreakdownControl />`. */
  breakdown?: ReactNode;
  /** Page-specific controls, after compare and breakdown: view toggles, sort, interval. */
  children?: ReactNode;
  /** Pushed to the far end of the row: search, column picker, the page's create button. */
  end?: ReactNode;
  className?: string;
}

/**
 * The row of compact controls under the stat band. The order is the same on
 * every page (compare, breakdown, then the page's own), so the two shared
 * controls are slots rather than children.
 */
export function AnalysisBar({ compare = <CompareControl />, breakdown, children, end, className }: AnalysisBarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {compare}
      {breakdown}
      {children}
      {end != null && <div className="ml-auto flex flex-wrap items-center gap-2">{end}</div>}
    </div>
  );
}
