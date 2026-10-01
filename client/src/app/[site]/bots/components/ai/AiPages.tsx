"use client";

import { Filter } from "@rybbit/shared";
import { File, SquareArrowOutUpRight } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { useGetSite } from "../../../../../api/admin/hooks/useSites";
import { AI_CHANNEL_FILTER } from "../../../../../api/analytics/hooks/bots/useBotFilters";
import { useGetBotAiPages } from "../../../../../api/analytics/hooks/bots/useGetBotAiPages";
import { useGetBotOverview } from "../../../../../api/analytics/hooks/bots/useGetBotOverview";
import { ErrorState } from "../../../../../components/ErrorState";
import { PivotActions, PivotButton } from "../../../../../components/site/PivotActions";
import { CardLoader } from "../../../../../components/ui/card";
import { usePivotHref } from "../../../../../hooks/usePivotHref";
import { useStore } from "../../../../../lib/store";
import { cn } from "../../../../../lib/utils";
import { StandardSkeleton } from "../../../components/shared/StandardSection/Skeleton";
import { TabbedSectionCard, type TabbedSectionItem } from "../../../components/shared/TabbedSectionCard";
import { usePagesHref } from "../../usePagesHref";
import { useFilterToggle } from "../BotSection";
import { BarRow, Figure, ListBody, ListCaption, ListEmpty, ListFooter, ListHeader, MUTED } from "./AiListParts";

type Tab = "pages" | "agent_pages";
type Purpose = "ai" | "ai_agent";

const READS = "w-14";
const AGENT = "hidden w-12 sm:block";
const LANDED = "w-12";
const VIEWS = "hidden w-20 sm:block";

const pathFilter = (pathname: string): Filter[] => [{ parameter: "pathname", type: "equals", value: [pathname] }];
const landedFilters = (pathname: string): Filter[] => [
  AI_CHANNEL_FILTER,
  { parameter: "entry_page", type: "equals", value: [pathname] },
];

function AiPagesList({ purpose, inDialog = false }: { purpose: Purpose; inDialog?: boolean }) {
  const t = useExtracted();
  const site = useStore(state => state.site);
  const { data, isLoading, isFetching, error, refetch } = useGetBotAiPages({ site, purpose, limit: 100 });
  const { data: overview } = useGetBotOverview({ site });
  const { data: siteMetadata } = useGetSite();
  const toggleFilter = useFilterToggle();
  const pivotHref = usePivotHref();
  const pagesHref = usePagesHref();

  const rows = data?.data ?? [];
  const total = data?.totalCount ?? 0;
  const agentsOnly = purpose === "ai_agent";
  const rank = (row: (typeof rows)[number]) => Number((agentsOnly ? row.agent_reads : row.reads) ?? 0);
  const max = rows.reduce((largest, row) => Math.max(largest, rank(row)), 0);
  // With blocking off the detected bots are in the pageview counts too.
  const viewsLabel = overview?.blocking === false ? t("Views") : t("Human views");

  return (
    <div className={inDialog ? "flex min-h-0 flex-1 flex-col" : undefined}>
      {isFetching && !isLoading && (
        <div className="absolute left-0 top-[-8px] h-full w-full">
          <CardLoader />
        </div>
      )}
      <ListCaption>
        {agentsOnly
          ? t("Pages an agent opened for a person. Landed is the AI visits that started on the page.")
          : t("Pages read by AI systems. Landed is the AI visits that started on the page.")}
      </ListCaption>
      <ListHeader label={t("Page")}>
        <Figure className={READS}>{t("AI reads")}</Figure>
        <Figure className={AGENT}>{t("Agent")}</Figure>
        <Figure className={LANDED}>{t("Landed")}</Figure>
        <Figure className={VIEWS}>{viewsLabel}</Figure>
      </ListHeader>
      <ListBody inDialog={inDialog}>
        {isLoading ? (
          <StandardSkeleton />
        ) : error && !data ? (
          <ErrorState title={t("Failed to load data")} message={error.message} refetch={refetch} />
        ) : rows.length === 0 ? (
          <ListEmpty>
            {agentsOnly ? t("No agent opened a page in this period.") : t("No AI system read a page in this period.")}
          </ListEmpty>
        ) : (
          rows.map(row => {
            const host = row.hostname || siteMetadata?.domain;
            const landed = Number(row.landed ?? 0);
            return (
              <BarRow
                key={row.pathname}
                fraction={max ? rank(row) / max : 0}
                onClick={row.pathname ? () => toggleFilter("pathname", row.pathname) : undefined}
                label={
                  <>
                    <span className="truncate" title={row.pathname}>
                      {row.pathname || t("Other")}
                    </span>
                    {row.pathname && (
                      <span className="hidden shrink-0 items-center group-focus-within:flex group-hover:flex">
                        <PivotActions filters={pathFilter(row.pathname)} actions={["sessions"]} showLabels={false}>
                          <PivotButton
                            icon={<File />}
                            label={t("Open in Pages")}
                            href={pagesHref(pathFilter(row.pathname))}
                            showLabel={false}
                          />
                        </PivotActions>
                        {host && (
                          <a
                            href={`https://${host}${row.pathname}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={event => event.stopPropagation()}
                            aria-label={t("Open page in a new tab")}
                            title={t("Open page in a new tab")}
                            className="ml-1 text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
                          >
                            <SquareArrowOutUpRight className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </span>
                    )}
                  </>
                }
                figures={
                  <>
                    {/* The figure the list is ranked by carries the weight. */}
                    <Figure className={cn(READS, !agentsOnly && "font-medium")}>
                      {Number(row.reads ?? 0).toLocaleString()}
                    </Figure>
                    <Figure className={cn(AGENT, agentsOnly && "font-medium")}>
                      {Number(row.agent_reads ?? 0).toLocaleString()}
                    </Figure>
                    <Figure className={LANDED}>
                      {landed > 0 ? (
                        <Link
                          href={pivotHref("sessions", landedFilters(row.pathname))}
                          prefetch={false}
                          onClick={event => event.stopPropagation()}
                          title={t("View the sessions that landed here")}
                          className="underline-offset-4 hover:underline"
                        >
                          {landed.toLocaleString()}
                        </Link>
                      ) : (
                        <span className={MUTED}>0</span>
                      )}
                    </Figure>
                    <Figure className={cn(VIEWS, "text-neutral-600 dark:text-neutral-300")}>
                      {Number(row.human_views ?? 0).toLocaleString()}
                    </Figure>
                  </>
                }
              />
            );
          })
        )}
      </ListBody>
      {!inDialog && (
        <ListFooter>
          <span className="tabular-nums">
            {rows.length > 0 &&
              (agentsOnly
                ? t("{shown, number} of {total, number} pages opened by agents", { shown: rows.length, total })
                : t("{shown, number} of {total, number} pages read by AI", { shown: rows.length, total }))}
          </span>
          <PivotButton icon={<File />} label={t("Open in Pages")} href={pagesHref()} />
        </ListFooter>
      )}
    </div>
  );
}

/** What the AI systems read, next to who else read it and where AI visits began. */
export function AiPages() {
  const t = useExtracted();

  const tabs: TabbedSectionItem<Tab>[] = [
    {
      value: "pages",
      label: t("All AI"),
      dialogTitle: t("Pages read by AI"),
      content: <AiPagesList purpose="ai" />,
      dialogContent: <AiPagesList purpose="ai" inDialog />,
    },
    {
      value: "agent_pages",
      label: t("Agents only"),
      dialogTitle: t("Pages agents opened"),
      // The pages a person's assistant was sent to are a different signal
      // from the pages a crawler swept: these track live intent.
      content: <AiPagesList purpose="ai_agent" />,
      dialogContent: <AiPagesList purpose="ai_agent" inDialog />,
    },
  ];

  return <TabbedSectionCard defaultValue="pages" tabs={tabs} className="h-auto" />;
}
