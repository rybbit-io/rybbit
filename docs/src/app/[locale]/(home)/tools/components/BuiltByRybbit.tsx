import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const inlineLinkClassName =
  "font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-2 transition-colors hover:decoration-emerald-600 dark:text-neutral-100 dark:decoration-neutral-700 dark:hover:decoration-emerald-400";

export function BuiltByRybbit() {
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <Image src="/rybbit/frog_light green.svg" width={22} height={22} alt="" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Made by</p>
          <h2 className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">Rybbit Analytics</h2>
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
        The open-source, cookieless analytics platform for sessions, funnels, journeys, errors, and replay.
      </p>

      <dl className="mt-6 divide-y divide-neutral-200 border-y border-neutral-200 text-xs dark:divide-neutral-800 dark:border-neutral-800">
        <div className="flex items-center justify-between py-3">
          <dt className="text-neutral-500 dark:text-neutral-400">License</dt>
          <dd className="font-medium text-neutral-900 dark:text-neutral-100">Open source</dd>
        </div>
        <div className="flex items-center justify-between py-3">
          <dt className="text-neutral-500 dark:text-neutral-400">Tracking</dt>
          <dd className="font-medium text-neutral-900 dark:text-neutral-100">Cookieless</dd>
        </div>
      </dl>

      <p className="mt-5 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
        Self-host it or use the free cloud tier. Learn why teams choose Rybbit as a{" "}
        <Link href="/compare/google-analytics" className={inlineLinkClassName}>
          Google Analytics alternative
        </Link>
        .
      </p>

      <Link
        href="/features"
        className="mt-5 inline-flex min-h-9 items-center gap-1.5 rounded-md text-sm font-medium text-neutral-900 transition-colors hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-100 dark:hover:text-emerald-400"
      >
        Explore Rybbit
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}
