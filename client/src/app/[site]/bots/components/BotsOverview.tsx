"use client";

import NumberFlow from "@number-flow/react";
import { HelpCircle } from "lucide-react";
import { type BotLayerKey } from "../../../../api/analytics/endpoints";
import { useGetBotOverview } from "../../../../api/analytics/hooks/bots/useGetBotOverview";
import { Card, CardContent, CardLoader } from "../../../../components/ui/card";
import { Skeleton } from "../../../../components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../components/ui/tooltip";
import { useStore } from "../../../../lib/store";
import { cn } from "../../../../lib/utils";
import { useBotsStore } from "../botsStore";

const layerLabels: { key: BotLayerKey; label: string; description: string }[] = [
  {
    key: "ua_pattern",
    label: "UA pattern",
    description: "Matches known crawler, bot, scanner, and automation strings in the request user agent.",
  },
  {
    key: "header_heuristics",
    label: "Header heuristics",
    description: "Flags requests with browser-like user agents but missing or unusual browser request headers.",
  },
  {
    key: "client_signals",
    label: "Client signals",
    description:
      "Uses browser-side and dimension fingerprints such as automation APIs, impossible dimensions, default automation viewports, outer dimension anomalies, and missing plugin/API traits.",
  },
  {
    key: "bot_asn",
    label: "Bot ASN",
    description: "Flags traffic from ASNs categorized as hosting, cloud, proxy, or other datacenter networks.",
  },
  {
    key: "rate_anomaly",
    label: "Rate anomaly",
    description: "Flags users or IPs that exceed the request volume thresholds for the current site.",
  },
];

function BotLayerTooltip({ description }: { description: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex cursor-help"
          onClick={event => event.stopPropagation()}
          onPointerDown={event => event.stopPropagation()}
        >
          <HelpCircle className="h-3 w-3 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs p-3">
        <p className="text-sm text-neutral-600 dark:text-neutral-200 leading-relaxed">{description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function StatCard({
  label,
  value,
  suffix,
  isLoading,
  active = false,
  description,
  onClick,
}: {
  label: string;
  value: number;
  suffix?: string;
  isLoading: boolean;
  active?: boolean;
  description?: string;
  onClick?: () => void;
}) {
  const isClickable = Boolean(onClick);

  return (
    <div
      className={cn(
        "border-r border-b border-neutral-100 dark:border-neutral-800 last:border-r-0 p-3",
        isClickable && "cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900",
        active && "bg-neutral-0 dark:bg-neutral-850"
      )}
      onClick={onClick}
      onKeyDown={event => {
        if (!onClick || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        onClick();
      }}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        {description && <BotLayerTooltip description={description} />}
      </div>
      <div className="text-2xl font-medium mt-1">
        {isLoading ? (
          <Skeleton className="h-8 w-20 rounded-md" />
        ) : (
          <>
            <NumberFlow respectMotionPreference={false} value={value} format={{ notation: "compact" }} />
            {suffix}
          </>
        )}
      </div>
    </div>
  );
}

export function BotsOverview() {
  const { site } = useStore();
  const { selectedLayer, setSelectedLayer } = useBotsStore();
  const { data, isLoading, isFetching } = useGetBotOverview({ site });
  const overview = data?.data;

  return (
    <Card>
      {isFetching && <CardLoader />}
      <CardContent className="p-0">
        <div className="grid grid-cols-2 md:grid-cols-4">
          <StatCard label="Bot requests blocked" value={overview?.bot_requests ?? 0} isLoading={isLoading} />
          <StatCard
            label="Bot share of total events"
            value={overview?.bot_percentage ?? 0}
            suffix="%"
            isLoading={isLoading}
          />
          {layerLabels.map(layer => (
            <StatCard
              key={layer.key}
              label={layer.label}
              value={overview?.[layer.key] ?? 0}
              isLoading={isLoading}
              active={selectedLayer === layer.key}
              description={layer.description}
              onClick={() => setSelectedLayer(selectedLayer === layer.key ? null : layer.key)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
