"use client";

import { TriangleAlert } from "lucide-react";
import { useExtracted } from "next-intl";
import { SiteResponse } from "../api/admin/endpoints";
import { useGetSite } from "../api/admin/hooks/useSites";
import { AutocaptureTargetType, isAutocaptureTargetType } from "../lib/events";
import { cn } from "../lib/utils";

// Defaults mirror the server column defaults surfaced in SiteSettings/TrackingTab.tsx:
// outbound tracking is on unless disabled, the rest are opt-in
function isTypeTracked(site: SiteResponse, type: AutocaptureTargetType): boolean {
  switch (type) {
    case "outbound":
      return site.trackOutbound ?? true;
    case "button_click":
      return site.trackButtonClicks ?? false;
    case "form_submit":
      return site.trackFormInteractions ?? false;
    case "copy":
      return site.trackCopy ?? false;
  }
}

interface EventTrackingNoticeProps {
  // A goal type ("path"/"event"/autocapture) or funnel step type ("page"/...)
  type: string;
  className?: string;
}

/**
 * Inline notice for goal/funnel target types that don't collect data out of
 * the box: custom events must be sent from the site's code, and autocapture
 * types only collect data while enabled in the site's tracking settings.
 * Renders nothing for types that are tracked (pageviews are always on).
 */
export function EventTrackingNotice({ type, className }: EventTrackingNoticeProps) {
  const t = useExtracted();
  const { data: site } = useGetSite();

  if (type === "event") {
    return (
      <p className={cn("text-xs leading-relaxed text-neutral-500 dark:text-neutral-400", className)}>
        {t("Custom events aren't captured automatically. Your site has to send them with rybbit.event().")}{" "}
        <a
          href="https://www.rybbit.io/docs/track-events"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-neutral-700 dark:hover:text-neutral-200"
        >
          {t("Learn more")}
        </a>
      </p>
    );
  }

  if (!site || !isAutocaptureTargetType(type) || isTypeTracked(site, type)) {
    return null;
  }

  const typeLabels: Record<AutocaptureTargetType, string> = {
    outbound: t("Outbound link"),
    button_click: t("Button click"),
    form_submit: t("Form submission"),
    copy: t("Copy"),
  };

  return (
    <p
      className={cn(
        "flex items-start gap-1.5 text-xs leading-relaxed text-amber-600 dark:text-amber-400",
        className
      )}
    >
      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        {t(
          "{type} tracking is turned off for this site, so these events aren't being collected. You can turn it on in the Tracking tab of the site settings.",
          { type: typeLabels[type] }
        )}
      </span>
    </p>
  );
}
