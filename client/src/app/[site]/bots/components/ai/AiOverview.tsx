"use client";

import NumberFlow from "@number-flow/react";
import { useMemo } from "react";
import { useGetBotAiSummary } from "../../../../../api/analytics/hooks/bots/useGetBotAiSummary";
import { useGetBotOverview } from "../../../../../api/analytics/hooks/bots/useGetBotOverview";
import { Card, CardContent, CardLoader } from "../../../../../components/ui/card";
import { Skeleton } from "../../../../../components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../../../components/ui/tooltip";
import { useStore } from "../../../../../lib/store";
import { HelpCircle } from "lucide-react";

function AiStat({
  label,
  value,
  hint,
  isLoading,
}: {
  label: string;
  value: number;
  hint: string;
  isLoading: boolean;
}) {
  return (
    <div className="border-r border-b border-neutral-100 dark:border-neutral-800 last:border-r-0 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-help">
              <HelpCircle className="h-3 w-3 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs p-3">
            <p className="text-sm text-neutral-600 dark:text-neutral-200 leading-relaxed">{hint}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="text-2xl font-medium mt-1">
        {isLoading ? (
          <Skeleton className="h-8 w-20 rounded-md" />
        ) : (
          <NumberFlow respectMotionPreference={false} value={value} format={{ notation: "compact" }} />
        )}
      </div>
    </div>
  );
}

export function AiOverview() {
  const { site } = useStore();
  const { data: overview, isLoading, isFetching } = useGetBotOverview({ site });
  const { data: summary, isLoading: isSummaryLoading } = useGetBotAiSummary({ site });

  const referrals = useMemo(
    () => (summary ?? []).reduce((total, row) => total + Number(row.referrals ?? 0), 0),
    [summary]
  );

  return (
    <Card>
      {isFetching && <CardLoader />}
      <CardContent className="p-0">
        <div className="grid grid-cols-2 md:grid-cols-4">
          <AiStat
            label="AI requests"
            value={overview?.ai_requests ?? 0}
            hint="Every request from a named AI system: training crawlers, answer-engine indexers, and agents fetching on a person's behalf."
            isLoading={isLoading}
          />
          <AiStat
            label="AI agents"
            value={overview?.ai_agent_requests ?? 0}
            hint="A person asked an assistant to open a page and it fetched it there and then — ChatGPT-User, Claude-User, Perplexity-User and friends. Closer to a visit than to a crawl."
            isLoading={isLoading}
          />
          <AiStat
            label="AI crawlers"
            value={overview?.ai_crawler_requests ?? 0}
            hint="Background crawling: pages collected to train a model or to build an answer-engine index. Nobody is waiting on the other end."
            isLoading={isLoading}
          />
          <AiStat
            label="Visits sent back"
            value={referrals}
            hint="People who arrived on your site from an AI product in this period. Compare against crawls to see which operators give something back."
            isLoading={isSummaryLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
}
