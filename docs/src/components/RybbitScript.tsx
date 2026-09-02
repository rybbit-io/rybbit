"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";
import { HOME_VARIANT_TAG, readHomeVariantCookie } from "@/lib/landing-experiment";

const subscribe = () => () => {};
const readVariant = () => readHomeVariantCookie(document.cookie) ?? "";
const serverSnapshot = () => null;

/**
 * The site's own Rybbit tracking script, tagged with the visitor's homepage
 * experiment arm (`data-tag`, see /docs/tagging) so every event they send —
 * on any page — can be filtered by variant in the dashboard.
 *
 * The cookie is only readable in the browser, so the tag renders after
 * hydration; `afterInteractive` scripts load at that point anyway. With no
 * cookie (crawlers, cookie blocked) the script loads untagged as before.
 */
export function RybbitScript() {
  const variant = useSyncExternalStore(subscribe, readVariant, serverSnapshot);
  if (variant === null) return null;
  return (
    <Script
      src="https://demo.rybbit.com/api/script.js"
      data-site-id="21"
      data-tag={variant ? HOME_VARIANT_TAG[variant] : undefined}
    />
  );
}
