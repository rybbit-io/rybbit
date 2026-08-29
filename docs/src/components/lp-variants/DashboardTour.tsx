"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { DemoEmbed } from "./shared";

/**
 * The interactive core of variant B: one dashboard, switched between its real
 * views, instead of six separate feature mockups.
 *
 * Every view is a live route on the public demo site, so nothing here can drift
 * out of date with the product — if a view is redesigned, this section shows
 * the redesign. Switching remounts the iframe (via `key`), which reloads it;
 * that is the cost of showing the real thing rather than a screenshot.
 */
const VIEWS = [
  { route: "main", label: "Live traffic", blurb: "Users, sessions, pageviews and referrers, updating as they happen." },
  { route: "pages", label: "Pages & entries", blurb: "Which pages people land on, read, and leave from." },
  { route: "funnels", label: "Funnels", blurb: "The steps that matter, and exactly where visitors drop off." },
  { route: "journeys", label: "Journeys", blurb: "The routes people actually take between pages." },
  { route: "performance", label: "Web vitals", blurb: "Core Web Vitals from real visits, by route, country and device." },
  { route: "errors", label: "Errors", blurb: "Client errors grouped by message, with the sessions that hit them." },
];

export function DashboardTour() {
  const [active, setActive] = useState(0);
  const view = VIEWS[active];

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
      <div className="min-w-0">
        <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {VIEWS.map((item, index) => {
            const isActive = index === active;
            return (
              <li key={item.route} className="shrink-0 lg:shrink">
                <button
                  type="button"
                  onClick={() => setActive(index)}
                  aria-pressed={isActive}
                  className={cn(
                    "flex w-full cursor-pointer items-baseline gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                    isActive
                      ? "bg-neutral-100 font-medium text-neutral-950 dark:bg-neutral-900 dark:text-white"
                      : "text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "font-mono text-[11px] tabular-nums",
                      isActive ? "text-emerald-700 dark:text-emerald-400" : "text-neutral-400 dark:text-neutral-600"
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-5 hidden max-w-[34ch] text-sm leading-6 text-neutral-600 dark:text-neutral-400 lg:block">
          {view.blurb}
        </p>
      </div>

      <div className="min-w-0">
        <div className="h-[380px] overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800 sm:h-[460px] lg:h-[540px]">
          <DemoEmbed key={view.route} route={view.route} title={`Rybbit demo — ${view.label}`} />
        </div>
        <p className="mt-4 text-sm leading-6 text-neutral-600 dark:text-neutral-400 lg:hidden">{view.blurb}</p>
      </div>
    </div>
  );
}
