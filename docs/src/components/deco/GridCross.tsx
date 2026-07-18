import { cn } from "@/lib/utils";

/**
 * Surveyor's tick placed where two hairline seams of the marketing grid meet.
 * Purely decorative; parents must be `relative`. Offsets are half the glyph
 * size so the cross centers exactly on the border intersection.
 */
export function GridCross({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className={cn(
        "pointer-events-none absolute z-10 size-3 text-neutral-500",
        className
      )}
    >
      <path d="M6 0v12M0 6h12" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/** The standard pair: one cross on each top corner of the 1200px container. */
export function SectionCrosses({ className, crossClassName }: { className?: string; crossClassName?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-x-0 top-0 z-10 mx-auto hidden max-w-[1200px] xl:block", className)}
    >
      <GridCross className={cn("-left-[6px] -top-[6px]", crossClassName)} />
      <GridCross className={cn("-right-[6px] -top-[6px]", crossClassName)} />
    </div>
  );
}
