import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

/** A card's title row: the title, an optional quiet note beside it, and one thing on the right. */
export function ProfileCardHeader({ title, note, right }: { title: string; note?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <div className="flex min-w-0 items-baseline gap-2">
        <h2 className="shrink-0 text-sm font-medium text-neutral-700 dark:text-neutral-200">{title}</h2>
        {note != null && <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">{note}</span>}
      </div>
      {right}
    </div>
  );
}

/** "Open in Pages ↗": the same user and period on another page of the site. */
export function OpenInLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="inline-flex shrink-0 items-center gap-1 rounded-sm text-xs text-neutral-500 underline-offset-2 hover:text-neutral-800 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 dark:text-neutral-400 dark:hover:text-neutral-200"
    >
      {children}
      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
    </Link>
  );
}
