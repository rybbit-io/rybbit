import { cn } from "@/lib/utils";

/**
 * The marketing pages' section mark: a small emerald signal square plus a
 * short label. One deliberate system, used on major section plates only.
 * Children should be an already-translated string.
 */
export function SectionKicker({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "flex items-center gap-2.5 text-base font-semibold tracking-tight text-emerald-700 dark:text-emerald-400",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="size-2 rounded-[1px] bg-emerald-600 [animation:kicker-pulse_3.2s_ease-in-out_infinite] dark:bg-emerald-400 motion-reduce:animate-none"
      />
      {children}
    </p>
  );
}
