import { Sparkles } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface InsightRowProps {
  /** One plain sentence about what changed and why it matters. */
  children: ReactNode;
  /** One follow-up, usually a `<Button variant="ghost" size="sm">`. */
  action?: ReactNode;
  className?: string;
}

/**
 * A single observation above a page's content. Neutral on purpose: no accent
 * tint, no border stripe. A page shows one or two at most.
 */
export function InsightRow({ children, action, className }: InsightRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg border border-neutral-100 bg-white px-3 py-2 text-sm dark:border-neutral-850 dark:bg-neutral-900",
        className
      )}
    >
      <Sparkles className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
      <div className="min-w-0 flex-1 text-neutral-700 dark:text-neutral-200">{children}</div>
      {action}
    </div>
  );
}
