"use client";

import { useExtracted } from "next-intl";
import { useGetSite } from "../../../../api/admin/hooks/useSites";
import { useGetBotOverview } from "../../../../api/analytics/hooks/bots/useGetBotOverview";
import { BucketSelection } from "../../../../components/BucketSelection";
import { SegmentedControl } from "../../../../components/interior/segmented-control";
import { AnalysisBar } from "../../../../components/site/AnalysisBar";
import { BreakdownControl } from "../../../../components/site/BreakdownControl";
import { SiteSettings } from "../../../../components/SiteSettings/SiteSettings";
import { useCanOnSite } from "../../../../hooks/usePermissions";
import { useStore } from "../../../../lib/store";
import { cn } from "../../../../lib/utils";
import { useEmbedPageOptions } from "../../utils";
import { type BotsBreakdown, type BotsLens, useBotsStore } from "../botsStore";

/**
 * Whether detected bots are being kept out of the site's analytics. Someone who
 * can configure the site gets the setting one click away; everyone else gets
 * the fact.
 */
function BlockingStatus() {
  const t = useExtracted();
  const site = useStore(state => state.site);
  const privateKey = useStore(state => state.privateKey);
  const { embed } = useEmbedPageOptions();
  const { data: overview } = useGetBotOverview({ site });
  const { data: siteMetadata } = useGetSite();
  const canConfigure = useCanOnSite("sites:configure");

  if (!overview) return null;

  const { blocking } = overview;
  const status = (
    <>
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          blocking ? "bg-green-500" : "bg-neutral-400 dark:bg-neutral-500"
        )}
        aria-hidden="true"
      />
      {blocking ? t("Bot blocking on") : t("Bot blocking off")}
    </>
  );
  const classes = "inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-neutral-600 dark:text-neutral-300";

  if (canConfigure && !privateKey && !embed && siteMetadata?.siteId) {
    return (
      <SiteSettings
        siteId={siteMetadata.siteId}
        trigger={
          <button
            type="button"
            className={cn(
              classes,
              "rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
            )}
            title={t("Open site settings")}
          >
            {status}
          </button>
        }
      />
    );
  }

  return <span className={classes}>{status}</span>;
}

/**
 * The page's controls, in the order every site page uses: compare, breakdown,
 * then the lens. Blocking status and the chart's bucket sit at the far end.
 */
export function BotsAnalysisBar() {
  const t = useExtracted();
  const lens = useBotsStore(state => state.lens);
  const setLens = useBotsStore(state => state.setLens);
  const breakdown = useBotsStore(state => state.breakdown);
  const setBreakdown = useBotsStore(state => state.setBreakdown);

  return (
    <AnalysisBar
      breakdown={
        <BreakdownControl<BotsBreakdown>
          value={breakdown}
          onChange={setBreakdown}
          options={[
            { value: "purpose", label: t("Purpose") },
            { value: "none", label: t("None") },
          ]}
        />
      }
      end={
        <>
          <BlockingStatus />
          <BucketSelection />
        </>
      }
    >
      <SegmentedControl<BotsLens>
        aria-label={t("Bot traffic view")}
        size="sm"
        options={[
          { value: "ai", label: t("AI & agents") },
          { value: "all", label: t("All bots") },
        ]}
        value={lens}
        onValueChange={setLens}
      />
    </AnalysisBar>
  );
}
