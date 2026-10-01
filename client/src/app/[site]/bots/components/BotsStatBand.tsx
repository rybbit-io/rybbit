"use client";

import { useWindowSize } from "@uidotdev/usehooks";
import { Bot, BotMessageSquare, BrainCircuit, ShieldCheck, Tags, Undo2 } from "lucide-react";
import { useExtracted } from "next-intl";
import { useGetBotOverview } from "../../../../api/analytics/hooks/bots/useGetBotOverview";
import { StatBand } from "../../../../components/site/StatBand";
import { NO_DELTA_TEXT, percentDelta, pointDelta } from "../../../../lib/delta";
import { useStore } from "../../../../lib/store";
import { formatCompact, formatCount, share } from "../botsData";

const number = (value: number | null | undefined) => Number(value ?? 0);
const percent = (value: number, digits = 1) => `${value.toFixed(digits)}%`;

/**
 * The page's opening numbers, the same under both lenses: how much of the
 * traffic is bots, what AI read, and what AI gave back. Each carries its change
 * against the comparison period; turning the comparison off removes them.
 */
export function BotsStatBand() {
  const t = useExtracted();
  const site = useStore(state => state.site);
  const { data: overview, isLoading } = useGetBotOverview({ site });
  const { data: previous } = useGetBotOverview({ site, periodTime: "previous" });

  const botRequests = number(overview?.bot_requests);
  const crawlerReads = number(overview?.ai_crawler_requests);
  const agentFetches = number(overview?.ai_agent_requests);
  const aiSessions = number(overview?.ai_sessions);
  const sessions = number(overview?.sessions);
  const blocking = overview?.blocking ?? true;

  const trainingShare = share(number(overview?.ai_training_requests), crawlerReads);
  const namedShare = share(number(overview?.named_requests), botRequests);
  const visitShare = share(aiSessions, sessions);

  // A failed load must not read as a site with no bots: dashes, not zeros.
  const failed = !overview && !isLoading;

  // StatBand goes to six cells a row at the lg viewport, but beside the sidebar
  // the page is too narrow for six until about 1400px: labels and values
  // truncate. Two rows of three until there is room.
  const { width } = useWindowSize();
  const columns = width !== null && width < 1400 ? 3 : 6;

  return (
    <StatBand
      isLoading={isLoading}
      columns={columns}
      cells={[
        {
          id: "share",
          icon: <Bot className="h-3 w-3" />,
          label: t("Bot share of traffic"),
          value: percent(number(overview?.bot_percentage)),
          delta: pointDelta(overview?.bot_percentage, previous?.bot_percentage),
          upIsGood: false,
          sub: t("{bots} of {total} requests", {
            bots: formatCompact(botRequests),
            total: formatCompact(number(overview?.total_events)),
          }),
        },
        {
          id: "requests",
          icon: <ShieldCheck className="h-3 w-3" />,
          label: t("Bot requests"),
          value: formatCount(botRequests),
          title: botRequests.toLocaleString(),
          delta: percentDelta(overview?.bot_requests, previous?.bot_requests),
          upIsGood: false,
          sub: blocking ? t("Kept out of your analytics") : t("Counted in your analytics"),
        },
        {
          id: "named",
          icon: <Tags className="h-3 w-3" />,
          label: t("Named bots"),
          value: number(overview?.named_bots).toLocaleString(),
          sub: namedShare === null ? "" : t("{share} of bot requests", { share: percent(namedShare, 0) }),
        },
        {
          id: "crawlers",
          icon: <BrainCircuit className="h-3 w-3" />,
          label: t("AI crawler reads"),
          value: formatCount(crawlerReads),
          title: crawlerReads.toLocaleString(),
          delta: percentDelta(overview?.ai_crawler_requests, previous?.ai_crawler_requests),
          sub: trainingShare === null ? "" : t("{share} of it for training", { share: percent(trainingShare, 0) }),
        },
        {
          id: "agents",
          icon: <BotMessageSquare className="h-3 w-3" />,
          label: t("AI agent fetches"),
          value: formatCount(agentFetches),
          title: agentFetches.toLocaleString(),
          delta: percentDelta(overview?.ai_agent_requests, previous?.ai_agent_requests),
          sub: t("Opened for a person, live"),
        },
        {
          id: "visits",
          icon: <Undo2 className="h-3 w-3" />,
          label: t("Visits sent back"),
          value: formatCount(aiSessions),
          title: aiSessions.toLocaleString(),
          delta: percentDelta(overview?.ai_sessions, previous?.ai_sessions),
          sub:
            visitShare === null
              ? ""
              : t("{share} of {count, number} sessions", { share: percent(visitShare), count: sessions }),
        },
      ].map(cell => (failed ? { ...cell, value: NO_DELTA_TEXT, title: undefined, delta: null, sub: "" } : cell))}
    />
  );
}
