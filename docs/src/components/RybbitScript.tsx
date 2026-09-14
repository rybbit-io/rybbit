"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";
import { HOME_EXPERIMENT, homeVariantTag, readHomeVariantCookie } from "@/lib/landing-experiment";

const subscribe = () => () => {};
const readVariant = () => (HOME_EXPERIMENT ? readHomeVariantCookie(document.cookie, HOME_EXPERIMENT) : null);
const serverSnapshot = () => undefined;

/**
 * The site's own Rybbit tracking script. While a homepage experiment is
 * running (see lib/landing-experiment.ts) it carries the visitor's arm as
 * `data-tag` (see /docs/tagging), so every event they send — on any page —
 * can be filtered by variant in the dashboard.
 *
 * The cookie is only readable in the browser, so during an experiment the
 * tag renders after hydration; `afterInteractive` scripts load at that point
 * anyway. With no cookie (crawlers, cookie blocked) or no experiment, the
 * script loads untagged.
 */
export function RybbitScript() {
  const variant = useSyncExternalStore(subscribe, readVariant, serverSnapshot);
  if (HOME_EXPERIMENT && variant === undefined) return null;
  return (
    <Script
      src="https://demo.rybbit.com/api/script.js"
      data-site-id="21"
      data-tag={HOME_EXPERIMENT && variant ? homeVariantTag(HOME_EXPERIMENT, variant) : undefined}
    />
  );
}
