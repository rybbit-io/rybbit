import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Neutral key caps for a shortcut, e.g. ["⌘", "K"]. */
export function KeyCaps({
  keys,
  className,
  ...props
}: { keys: readonly string[] } & Omit<HTMLAttributes<HTMLSpanElement>, "children">) {
  return (
    <span className={cn("flex shrink-0 items-center gap-1", className)} {...props}>
      {keys.map((key, index) => (
        <kbd
          key={index}
          // Preflight sets kbd in the mono stack; key caps stay in Inter like the rest of the UI.
          className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-neutral-200 px-1 font-[family-name:inherit] text-[11px] font-medium leading-none text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}
