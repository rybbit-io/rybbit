import { cn } from "@/lib/utils";

/**
 * Shared layout system for the marketing landing page.
 *
 * Every band on the page is built from the same pieces — one container,
 * one hairline, one header pattern — so spacing and alignment stay
 * consistent across sections that were written months apart.
 */

export const landingContainer = "mx-auto w-full max-w-[1200px] px-6";

export const landingButtonPrimary =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-md bg-emerald-600 px-5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60";

export const landingButtonSecondary =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-md border border-neutral-300 px-5 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800/60";

interface LandingSectionProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Optional slot rendered at the right end of the header row on md+. */
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function LandingSection({ title, description, aside, children, className }: LandingSectionProps) {
  return (
    <section className={cn("w-full border-t border-neutral-200 dark:border-neutral-800", className)}>
      <div className={cn(landingContainer, "py-16 md:py-24")}>
        {title ? (
          <div className="mb-10 grid grid-cols-1 gap-6 md:mb-14 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-neutral-900 md:text-[2rem] md:leading-[1.15] dark:text-neutral-50">
                {title}
              </h2>
              {description ? (
                <p className="mt-3 max-w-xl text-base text-neutral-600 dark:text-neutral-400">{description}</p>
              ) : null}
            </div>
            {aside ? <div className="md:col-span-4 md:justify-self-end">{aside}</div> : null}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}

/**
 * Hairline-divided "spec sheet" grid. `gap-px` over a border-colored
 * background paints 1px rules between the canvas-colored cells.
 */
export function SpecGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-800",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SpecCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("bg-background p-5", className)}>{children}</div>;
}
