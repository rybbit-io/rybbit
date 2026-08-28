"use client";

import { Info } from "lucide-react";

/**
 * The dashboard is honest about its vantage point or it is not trustworthy.
 * Rybbit only sees a request if the page ran its script, so a crawler that
 * fetches HTML and executes nothing never appears here at all — and without
 * saying so, a low AI number reads as "nobody is crawling me" when it may mean
 * "the ones crawling you are invisible from the browser".
 */
export function AiCoverageNote() {
  return (
    <div className="flex items-start gap-2 px-1 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <p>
        These counts cover bots that execute JavaScript. Crawlers that fetch your HTML and run nothing — which includes
        most training crawlers — never reach Rybbit unless your server reports them through the tracking API.
      </p>
    </div>
  );
}
