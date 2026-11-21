"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Fragment, MouseEvent } from "react";
import { cn } from "@/lib/utils";

const CHIP =
  "inline-flex max-w-[240px] items-center rounded-md border border-neutral-150 bg-neutral-50 px-1.5 py-0.5 text-xs font-medium text-neutral-800 dark:border-neutral-800 dark:bg-neutral-850 dark:text-neutral-200";

// A chip inside a clickable row must not also trigger the row.
const stopClick = (event: MouseEvent) => event.stopPropagation();

export interface PathChipsProps {
  path: string[];
  /** Makes each page a link; return undefined for a step that is not one page. */
  pageHref?: (page: string) => string | undefined;
  className?: string;
  chipClassName?: string;
}

/** A path as a row of page chips: / › /pricing › /signup. */
export function PathChips({ path, pageHref, className, chipClassName }: PathChipsProps) {
  return (
    <span className={cn("inline-flex min-w-0 flex-wrap items-center gap-1", className)}>
      {path.map((page, index) => {
        const href = pageHref?.(page);
        return (
          <Fragment key={index}>
            {index > 0 && (
              <ChevronRight className="h-3 w-3 shrink-0 text-neutral-400 dark:text-neutral-500" aria-hidden="true" />
            )}
            {href ? (
              <Link
                href={href}
                prefetch={false}
                title={page}
                onClick={stopClick}
                className={cn(CHIP, "hover:border-neutral-300 dark:hover:border-neutral-700", chipClassName)}
              >
                <span className="truncate">{page}</span>
              </Link>
            ) : (
              <span title={page} className={cn(CHIP, chipClassName)}>
                <span className="truncate">{page}</span>
              </span>
            )}
          </Fragment>
        );
      })}
    </span>
  );
}
