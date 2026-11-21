import type { ReactNode } from "react";
import { GridCrosses } from "@/components/GridCrosses";

interface LegalPageShellProps {
  title: string;
  lastUpdated?: string;
  intro?: ReactNode;
  children: ReactNode;
}

/**
 * Shared chrome for the legal / policy pages (privacy, terms, DPA, security).
 * A plate header on the 1200px rail plus a single readable prose column, so
 * these documents sit in the same instrument-sheet frame as the marketing
 * pages instead of floating as bare centered text.
 */
export function LegalPageShell({ title, lastUpdated, intro, children }: LegalPageShellProps) {
  return (
    <div className="overflow-x-clip">
      <section className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid lg:grid-cols-12">
          <GridCrosses />
          <div className="relative overflow-hidden border-b border-neutral-200 bg-plate-accent px-5 py-12 dark:border-neutral-800 sm:px-8 md:py-16 lg:col-span-8 lg:border-b-0 lg:border-r lg:px-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%),linear-gradient(to_left,transparent,black_40px)] [mask-composite:intersect]"
            />
            <h1 className="relative max-w-2xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-neutral-950 text-balance dark:text-neutral-50 md:text-5xl">
              {title}
            </h1>
          </div>

          <div className="flex flex-col justify-end gap-4 px-5 py-10 sm:px-8 lg:col-span-4 lg:px-10 lg:py-16">
            {lastUpdated && (
              <div className="text-sm">
                <p className="font-medium text-neutral-500 dark:text-neutral-400">Last updated</p>
                <p className="mt-1 text-neutral-950 dark:text-neutral-50">{lastUpdated}</p>
              </div>
            )}
            {intro && <p className="max-w-md text-base leading-7 text-neutral-600 text-pretty dark:text-neutral-400">{intro}</p>}
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses />
          <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 md:py-16 lg:px-10">
            <div className="prose prose-neutral max-w-none dark:prose-invert prose-headings:tracking-tight prose-a:font-medium prose-a:text-emerald-700 prose-a:no-underline hover:prose-a:underline dark:prose-a:text-emerald-400">
              {children}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
