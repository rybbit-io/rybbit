import { cn } from "@/lib/utils";

function Cross({ className }: { className?: string }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 11 11"
      fill="none"
      className={cn("absolute", className)}
    >
      <path d="M5.5 0V11M0 5.5H11" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/**
 * Crosshair tick marks that sit on the intersections of the structural
 * hairline grid — one at each top corner of a section's bordered column.
 * The parent container must be `relative`.
 */
export function GridCrosses({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-10 text-neutral-400 dark:text-neutral-600",
        className
      )}
    >
      {/* The hairlines are 1px borders drawn just outside this padding box, so
          their centerlines sit at -0.5px — offset the anchors to match. */}
      <Cross className="left-[-0.5px] top-[-0.5px] -translate-x-1/2 -translate-y-1/2" />
      <Cross className="right-[-0.5px] top-[-0.5px] translate-x-1/2 -translate-y-1/2" />
    </div>
  );
}
