"use client";

import { HelpCircle, X } from "lucide-react";
import { useExtracted } from "next-intl";
import { type BotLayerKey } from "../../../../api/analytics/endpoints";
import { useGetBotOverview } from "../../../../api/analytics/hooks/bots/useGetBotOverview";
import { Delta } from "../../../../components/site/Delta";
import { Button } from "../../../../components/ui/button";
import { Card, CardLoader } from "../../../../components/ui/card";
import { Skeleton } from "../../../../components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../components/ui/tooltip";
import { NO_DELTA_TEXT, percentDelta } from "../../../../lib/delta";
import { useStore } from "../../../../lib/store";
import { cn } from "../../../../lib/utils";
import { share } from "../botsData";
import { useBotsStore } from "../botsStore";

const LAYER_KEYS: BotLayerKey[] = ["ua_pattern", "header_heuristics", "client_signals", "bot_asn", "rate_anomaly"];

function useLayerCopy(): Record<BotLayerKey, { label: string; description: string }> {
  const t = useExtracted();
  return {
    ua_pattern: {
      label: t("UA pattern"),
      description: t("Matches known crawler, bot, scanner, and automation strings in the request user agent."),
    },
    header_heuristics: {
      label: t("Header heuristics"),
      description: t("Flags requests with browser-like user agents but missing or unusual browser request headers."),
    },
    client_signals: {
      label: t("Client signals"),
      description: t(
        "Uses browser-side and dimension fingerprints such as automation APIs, impossible dimensions, default automation viewports, outer dimension anomalies, and missing plugin/API traits."
      ),
    },
    bot_asn: {
      label: t("Bot ASN"),
      description: t("Flags traffic from networks known to belong to bots, scanners and AI providers."),
    },
    rate_anomaly: {
      label: t("Rate anomaly"),
      description: t("Flags request bursts and crawl-shaped behavior that no person produces."),
    },
  };
}

/**
 * How the traffic was caught. Each layer is a filter: selecting one narrows
 * the whole all-bots view to the requests that layer convicted, and says so.
 */
export function DetectionLayers() {
  const t = useExtracted();
  const site = useStore(state => state.site);
  const selectedLayer = useBotsStore(state => state.selectedLayer);
  const setSelectedLayer = useBotsStore(state => state.setSelectedLayer);
  const { data: overview, isLoading, isFetching } = useGetBotOverview({ site });
  const { data: previous } = useGetBotOverview({ site, periodTime: "previous" });
  const copy = useLayerCopy();

  const botRequests = Number(overview?.bot_requests ?? 0);

  return (
    <Card>
      {isFetching && !isLoading && <CardLoader />}
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-4 pb-3 pt-3.5">
        <div className="min-w-0">
          <h2 className="font-semibold leading-none tracking-tight">{t("Detection layers")}</h2>
          <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            {selectedLayer
              ? t("Every number on this page is narrowed to requests caught by {layer}.", {
                  layer: copy[selectedLayer].label,
                })
              : t("How each request was caught. A request can match several layers. Select one to filter the page.")}
          </p>
        </div>
        {selectedLayer && (
          <Button variant="outline" size="sm" onClick={() => setSelectedLayer(null)}>
            <X />
            {t("Clear layer")}
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-neutral-100 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800 sm:grid-cols-3 xl:grid-cols-5">
        {LAYER_KEYS.map((key, index) => {
          const value = Number(overview?.[key] ?? 0);
          const active = selectedLayer === key;
          const layerShare = share(value, botRequests);
          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              onClick={() => setSelectedLayer(active ? null : key)}
              onKeyDown={event => {
                if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
                event.preventDefault();
                setSelectedLayer(active ? null : key);
              }}
              className={cn(
                "min-w-0 cursor-pointer bg-white px-3.5 py-2.5 transition-colors hover:bg-neutral-50 focus-visible:outline-none dark:bg-neutral-900 dark:hover:bg-neutral-850",
                // The last cell fills the row a five-cell grid leaves short.
                index === LAYER_KEYS.length - 1 && "col-span-2 xl:col-span-1",
                active
                  ? "ring-2 ring-inset ring-neutral-900 dark:ring-neutral-100"
                  : "focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-neutral-400"
              )}
            >
              <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                <span className="truncate">{copy[key].label}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="inline-flex cursor-help"
                      onClick={event => event.stopPropagation()}
                      onPointerDown={event => event.stopPropagation()}
                    >
                      <HelpCircle className="h-3 w-3" aria-hidden="true" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs p-3">
                    <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-200">
                      {copy[key].description}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              {isLoading ? (
                <div className="mt-0.5 flex h-6 items-center">
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
              ) : (
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span className="text-base font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
                    {/* A failed load must not read as a layer that caught nothing. */}
                    {overview ? value.toLocaleString() : NO_DELTA_TEXT}
                  </span>
                  <Delta value={percentDelta(overview?.[key], previous?.[key])} upIsGood={false} />
                </div>
              )}
              <div className="mt-0.5 h-4 truncate text-xs text-neutral-500 dark:text-neutral-400">
                {!isLoading &&
                  layerShare !== null &&
                  t("{share} of bot requests", { share: `${layerShare.toFixed(0)}%` })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
