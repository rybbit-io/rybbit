import { cn } from "@/lib/utils";

interface DemoFrameProps {
  /** Slim mono header text, styled as a product artifact (untranslated by design). */
  label?: string;
  /** Right side of the header bar — pass translated content when it's real copy. */
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Extra classes for the inner framed panel (e.g. to remove padding). */
  frameClassName?: string;
}

/**
 * Shared readout frame for the landing feature demos: the hero's dotted
 * instrument mat holding a framed panel with a slim mono header. Sits as the
 * last child of a Card (which is a column flexbox) and stretches to meet the
 * card's bottom seam via negative margin, so every demo in the grid runs
 * edge-to-edge no matter how tall its row is.
 */
export function DemoFrame({ label, right, children, className, frameClassName }: DemoFrameProps) {
  return (
    <div
      className={cn(
        "-mx-1 -mb-5 mt-6 flex-1 rounded-t-md border border-b-0 border-neutral-200 bg-neutral-100 p-1.5 pb-0 [background-image:radial-gradient(circle,rgba(0,0,0,0.08)_1px,transparent_1px)] [background-size:14px_14px] dark:border-neutral-800 dark:bg-neutral-900 dark:[background-image:radial-gradient(circle,rgba(255,255,255,0.07)_1px,transparent_1px)] md:-mb-8",
        className
      )}
    >
      <div
        className={cn(
          "flex h-full flex-col overflow-hidden rounded-t-[5px] border border-b-0 border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950",
          frameClassName
        )}
      >
        {(label || right) && (
          <div className="flex h-8 shrink-0 items-center justify-between gap-2 border-b border-neutral-200 px-3 dark:border-neutral-800">
            {label && <span className="truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">{label}</span>}
            {right && (
              <span className="flex shrink-0 items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                {right}
              </span>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/** Pulsing live indicator dot, matching the hero's. Static under reduced motion. */
export function LiveDot() {
  return (
    <span className="relative flex size-2" aria-hidden="true">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:hidden" />
      <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
    </span>
  );
}
