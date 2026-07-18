import { cn } from "@/lib/utils";

/*
 * Shared layout vocabulary for the marketing/landing surface.
 *
 * The page is built on a single 1152px "rail": two full-height hairlines that
 * every section, the header, and the footer align to. Sections are separated
 * by horizontal hairlines that meet the rail at small tick marks. All spacing,
 * radii, and button styles on the landing pages come from here so the surface
 * stays consistent as sections get added or rewritten.
 */

// One container class used by the header, every section, and the footer.
export const CONTAINER = "mx-auto w-full max-w-6xl px-5 sm:px-6";

export const HAIRLINE = "border-neutral-200/80 dark:border-neutral-800/80";

// Buttons — one primary and one secondary style for the whole surface.
const BUTTON_BASE =
  "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950";

export const BUTTON_PRIMARY = cn(BUTTON_BASE, "bg-emerald-600 hover:bg-emerald-500 text-white");

export const BUTTON_SECONDARY = cn(
  BUTTON_BASE,
  "border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
);

export const BUTTON_LG = "h-11 px-5 text-[15px]";
export const BUTTON_SM = "h-8 px-3 text-sm";

/** Full-height vertical hairlines behind the whole page. Render once, first child of a `relative` wrapper. */
export function LandingRail() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden sm:block">
      <div className={cn("mx-auto h-full w-full max-w-6xl border-x", HAIRLINE)} />
    </div>
  );
}

/** Small + mark where a section hairline crosses the rail. */
function Tick({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("pointer-events-none absolute z-10 hidden size-[9px] text-neutral-400 dark:text-neutral-600 sm:block", className)}
    >
      <svg viewBox="0 0 9 9" fill="none" className="size-full">
        <path d="M4.5 0v9M0 4.5h9" stroke="currentColor" strokeWidth="1" />
      </svg>
    </span>
  );
}

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  /** Drop the top hairline + ticks (e.g. for the section directly under the hero). */
  flush?: boolean;
  id?: string;
}

/** A landing section: rail-width, top hairline with corner ticks, uniform vertical rhythm. */
export function Section({ children, className, flush = false, id }: SectionProps) {
  return (
    <section id={id} className="relative mx-auto w-full max-w-6xl">
      <div
        className={cn(
          "relative px-5 sm:px-6 py-16 md:py-24",
          !flush && ["border-t", HAIRLINE],
          className
        )}
      >
        {!flush && (
          <>
            <Tick className="-left-[5px] -top-[5px]" />
            <Tick className="-right-[5px] -top-[5px]" />
          </>
        )}
        {children}
      </div>
    </section>
  );
}

// Shared section-title typography, exported so split-layout sections can match exactly.
export const SECTION_TITLE_CLASS =
  "text-[1.75rem] leading-[1.15] md:text-[2.125rem] font-semibold tracking-tight text-neutral-950 dark:text-white text-balance";

export const SECTION_SUB_CLASS =
  "mt-3 text-base md:text-lg leading-relaxed text-neutral-600 dark:text-neutral-400 text-pretty";

interface SectionHeaderProps {
  title: React.ReactNode;
  sub?: React.ReactNode;
  /** Optional right-aligned slot (a link, a small stat). */
  aside?: React.ReactNode;
  className?: string;
}

/** One section-header anatomy for the whole page: left-aligned title + muted sub. */
export function SectionHeader({ title, sub, aside, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-8 gap-y-4", className)}>
      <div className="max-w-2xl">
        <h2 className={SECTION_TITLE_CLASS}>{title}</h2>
        {sub && <p className={SECTION_SUB_CLASS}>{sub}</p>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}
