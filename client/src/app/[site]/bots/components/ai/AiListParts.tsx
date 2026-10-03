"use client";

import { Info } from "lucide-react";
import { type KeyboardEvent, type ReactNode } from "react";
import { ScrollArea } from "../../../../../components/ui/scroll-area";
import { cn } from "../../../../../lib/utils";

/**
 * The two AI cards under the operator table share one row grammar: a label
 * with a proportion bar behind it, then figures in fixed columns. The bar is
 * kept to the label's track so the figures stay in clean columns.
 */

export const MUTED = "text-neutral-500 dark:text-neutral-400";

/** One line under the tabs saying what the list counts. */
export function ListCaption({ children }: { children: ReactNode }) {
  return <p className={cn("pb-1 pt-2 text-xs", MUTED)}>{children}</p>;
}

/** A right-aligned figure column. Give the header and every row the same width class. */
export function Figure({ className, children }: { className?: string; children?: ReactNode }) {
  return <span className={cn("shrink-0 text-right", className)}>{children}</span>;
}

export function ListHeader({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 pb-1 pl-2 pr-2 text-xs", MUTED)}>
      <span>{label}</span>
      <span className="flex items-center gap-3">{children}</span>
    </div>
  );
}

export function BarRow({
  fraction,
  label,
  figures,
  onClick,
  title,
}: {
  /** 0 to 1: how long the bar is against the list's largest row. */
  fraction: number;
  label: ReactNode;
  figures: ReactNode;
  /** Makes the whole row a filter toggle. */
  onClick?: () => void;
  title?: string;
}) {
  const onKeyDown = (event: KeyboardEvent) => {
    if (!onClick || event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onClick();
  };

  return (
    <div
      className={cn(
        "group flex h-7 items-center gap-3 rounded-md pr-2 text-xs hover:bg-neutral-50 dark:hover:bg-neutral-850",
        onClick &&
          "cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-neutral-400"
      )}
      onClick={onClick}
      onKeyDown={onKeyDown}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={title}
    >
      <div className="relative flex h-full min-w-0 flex-1 items-center px-2">
        <div
          className="absolute inset-y-0 left-0 rounded-md bg-dataviz opacity-25"
          style={{ width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }}
          aria-hidden="true"
        />
        <div className="relative flex min-w-0 items-center gap-2 text-neutral-900 dark:text-neutral-100">{label}</div>
      </div>
      <div className="flex shrink-0 items-center gap-3 tabular-nums text-neutral-900 dark:text-neutral-100">
        {figures}
      </div>
    </div>
  );
}

/** Rows in a fixed-height scroller on the card, and filling the dialog when expanded. */
export function ListBody({ inDialog, children }: { inDialog?: boolean; children: ReactNode }) {
  return (
    // [&>div]:!block forces Radix's display:table viewport wrapper to block so a long path truncates
    // instead of pushing the figures out of the card.
    <ScrollArea className={inDialog ? "min-h-0 flex-1 pr-3" : "h-[268px]"} viewportClassName="[&>div]:!block">
      <div className="flex flex-col gap-1">{children}</div>
    </ScrollArea>
  );
}

export function ListEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center gap-2 px-4 py-10 text-center text-sm text-neutral-600 dark:text-neutral-300">
      <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
      {children}
    </div>
  );
}

/** The quiet line under a list: a total on the left, where to go next on the right. */
export function ListFooter({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "-mx-4 -mb-4 mt-2 flex min-h-10 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-neutral-100 px-4 py-1.5 text-xs dark:border-neutral-800",
        MUTED
      )}
    >
      {children}
    </div>
  );
}
