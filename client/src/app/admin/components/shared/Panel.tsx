"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PanelProps {
  /** Left side of the header row. Strings render as a title; nodes render as-is (e.g. a TabsList). */
  title?: ReactNode;
  /** Right side of the header row. */
  actions?: ReactNode;
  /** Render children flush against the panel edges (tables); default adds p-4. */
  flush?: boolean;
  className?: string;
  children: ReactNode;
}

export function Panel({ title, actions, flush = false, className, children }: PanelProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-neutral-100 bg-white dark:border-neutral-850 dark:bg-neutral-900",
        className
      )}
    >
      {(title || actions) && (
        <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-neutral-100 px-4 py-2 dark:border-neutral-850">
          {typeof title === "string" ? <h3 className="text-sm font-medium">{title}</h3> : (title ?? <div />)}
          {actions}
        </div>
      )}
      <div className={cn(!flush && "p-4")}>{children}</div>
    </div>
  );
}

/** Hairline-bordered wrapper that gives every admin table the same seams. */
export function TableShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-neutral-100 bg-white dark:border-neutral-850 dark:bg-neutral-900",
        className
      )}
    >
      {children}
    </div>
  );
}
