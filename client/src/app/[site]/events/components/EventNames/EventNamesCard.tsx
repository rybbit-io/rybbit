"use client";

import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { useExtracted } from "next-intl";
import { ReactNode, useState } from "react";

import { EventTrendBucket } from "@/api/analytics/endpoints";
import { useGetAutocaptureEvents } from "@/api/analytics/hooks/events/useGetAutocaptureEvents";
import { useGetOutboundLinks } from "@/api/analytics/hooks/events/useGetOutboundLinks";
import { useGetFunnels } from "@/api/analytics/hooks/funnels/useGetFunnels";
import { useGetGoals } from "@/api/analytics/hooks/goals/useGetGoals";
import { ErrorState } from "@/components/ErrorState";
import { ExternalLink } from "@/components/ExternalLink";
import { SegmentedControl } from "@/components/interior/segmented-control";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCanOnSite } from "@/hooks/usePermissions";
import { useComparisonEnabled, useStore } from "@/lib/store";
import { EventNameRow, EventNameSortKey, filterEventNameRows, sortEventNameRows } from "../../utils/eventNameRows";
import { formatShare } from "../../utils/properties";
import { AutocaptureRow, AutocaptureTable } from "./AutocaptureTable";
import { EventNamesSort, EventNamesTable, EventNamesTableSkeleton } from "./EventNamesTable";

type Kind = "events" | "outbound" | "button_click" | "form_submit" | "copy";

// Rows on show before "Show all".
const ROW_LIMIT = 8;
// The goals endpoint's largest page.
const GOALS_PAGE_SIZE = 100;

// The first click on a column sorts it this way: biggest first, except names.
const FIRST_DIRECTION: Record<EventNameSortKey, "asc" | "desc"> = {
  name: "asc",
  count: "desc",
  users: "desc",
  perUser: "desc",
  change: "desc",
  lastSeen: "desc",
};

function Message({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-4 py-10 text-center">
      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{title}</p>
      {children && <div className="text-sm text-neutral-500 dark:text-neutral-400">{children}</div>}
    </div>
  );
}

/** "8 of 24. The other 16 account for …" and the switch between the short list and all of it. */
function ListFooter({
  shown,
  total,
  restEvents,
  restShare,
  expanded,
  onToggle,
}: {
  shown: number;
  total: number;
  /** Events in the rows that are not on show. */
  restEvents: number;
  restShare: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const t = useExtracted();
  if (total <= ROW_LIMIT) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 px-4 py-2 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
      <span>
        {expanded
          ? t("All {total} shown.", { total: total.toLocaleString() })
          : t("{shown} of {total}. The other {rest} account for {events} events ({share}).", {
              shown: shown.toLocaleString(),
              total: total.toLocaleString(),
              rest: (total - shown).toLocaleString(),
              events: restEvents.toLocaleString(),
              share: formatShare(restShare),
            })}
      </span>
      <Button type="button" variant="ghost" size="xs" className="gap-1" onClick={onToggle}>
        {expanded ? t("Show fewer") : t("Show all {total}", { total: total.toLocaleString() })}
        {expanded ? <ChevronUp /> : <ChevronDown />}
      </Button>
    </div>
  );
}

interface EventNamesCardProps {
  /** Every custom event name in the period, biggest first. */
  rows: EventNameRow[];
  /** No answer yet, including while the request waits for the site. */
  isLoading: boolean;
  isError: boolean;
  trendBucket: EventTrendBucket;
  /** Names that used to fire daily and have stopped. */
  silentEvents: ReadonlySet<string>;
}

/**
 * What fired in the period: the custom event names with who fired them and how
 * that is moving, and the autocaptured events grouped by what was clicked,
 * submitted or copied.
 */
export function EventNamesCard({ rows, isLoading, isError, trendBucket, silentEvents }: EventNamesCardProps) {
  const t = useExtracted();
  const privateKey = useStore(state => state.privateKey);
  const comparisonEnabled = useComparisonEnabled();
  const canWriteGoals = useCanOnSite("goals:write");

  const [kind, setKind] = useState<Kind>("events");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [sort, setSort] = useState<EventNamesSort>({ key: "count", direction: "desc" });

  const goals = useGetGoals({ pageSize: GOALS_PAGE_SIZE });
  const funnels = useGetFunnels();
  const outbound = useGetOutboundLinks();
  const buttons = useGetAutocaptureEvents("button_click");
  const forms = useGetAutocaptureEvents("form_submit");
  const copies = useGetAutocaptureEvents("copy");

  const autocapture: Record<
    Exclude<Kind, "events">,
    { rows: AutocaptureRow[] | undefined; isLoading: boolean; isError: boolean; valueLabel: string }
  > = {
    outbound: {
      rows: outbound.data?.map(link => ({ value: String(link.url), count: link.count, lastSeen: link.lastClicked })),
      isLoading: outbound.isPending,
      isError: outbound.isError,
      valueLabel: t("Link"),
    },
    button_click: {
      rows: buttons.data?.map(row => ({ value: row.value, count: row.count, lastSeen: row.lastOccurred })),
      isLoading: buttons.isPending,
      isError: buttons.isError,
      valueLabel: t("Button text"),
    },
    form_submit: {
      rows: forms.data?.map(row => ({ value: row.value, count: row.count, lastSeen: row.lastOccurred })),
      isLoading: forms.isPending,
      isError: forms.isError,
      valueLabel: t("Form"),
    },
    copy: {
      rows: copies.data?.map(row => ({ value: row.value, count: row.count, lastSeen: row.lastOccurred })),
      isLoading: copies.isPending,
      isError: copies.isError,
      valueLabel: t("Copied text"),
    },
  };

  const tab = (label: string, count: number | undefined) => (
    <>
      {label}
      {count !== undefined && <span className="tabular-nums opacity-60">{count.toLocaleString()}</span>}
    </>
  );
  const options: { value: Kind; label: ReactNode }[] = [
    { value: "events", label: tab(t("Custom events"), isLoading || isError ? undefined : rows.length) },
    { value: "outbound", label: tab(t("Outbound links"), autocapture.outbound.rows?.length) },
    { value: "button_click", label: tab(t("Button clicks"), autocapture.button_click.rows?.length) },
    { value: "form_submit", label: tab(t("Form submits"), autocapture.form_submit.rows?.length) },
    { value: "copy", label: tab(t("Copies"), autocapture.copy.rows?.length) },
  ];

  const changeSort = (key: EventNameSortKey) =>
    setSort(current =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: FIRST_DIRECTION[key] }
    );

  const errorState = (
    <ErrorState
      title={t("Failed to load events")}
      message={t("There was a problem fetching the events. Please try again later.")}
    />
  );
  const noMatch = <Message title={t('Nothing matches "{search}"', { search: search.trim() })} />;

  let body: ReactNode;
  if (kind === "events") {
    const matching = sortEventNameRows(filterEventNameRows(rows, search), sort.key, sort.direction);
    const shown = expanded ? matching : matching.slice(0, ROW_LIMIT);
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    const restEvents = matching.slice(shown.length).reduce((sum, row) => sum + row.count, 0);

    body = isLoading ? (
      <EventNamesTableSkeleton />
    ) : isError ? (
      errorState
    ) : rows.length === 0 ? (
      <Message title={t("No custom events in this period")}>
        <p>{t("Try a different date range or filter.")}</p>
        <ExternalLink href="https://www.rybbit.com/docs/track-events" className="mt-2 inline-flex items-center gap-1">
          <BookOpen className="h-4 w-4" />
          {t("Learn how to track events")}
        </ExternalLink>
      </Message>
    ) : matching.length === 0 ? (
      noMatch
    ) : (
      <>
        <EventNamesTable
          rows={shown}
          maxCount={Math.max(...rows.map(row => row.count), 0)}
          sort={sort}
          onSort={changeSort}
          trendBucket={trendBucket}
          goals={goals.data?.data}
          funnels={funnels.data}
          isLoadingUsedIn={goals.isLoading || funnels.isLoading}
          // Without the goal list there is no telling whether the event already has one.
          canCreateGoal={canWriteGoals && !privateKey && goals.isSuccess}
          silentEvents={silentEvents}
          showChange={comparisonEnabled}
        />
        <ListFooter
          shown={shown.length}
          total={matching.length}
          restEvents={restEvents}
          restShare={total > 0 ? restEvents / total : 0}
          expanded={expanded}
          onToggle={() => setExpanded(current => !current)}
        />
      </>
    );
  } else {
    const list = autocapture[kind];
    const all = list.rows ?? [];
    const query = search.trim().toLowerCase();
    const matching = query ? all.filter(row => row.value.toLowerCase().includes(query)) : all;
    const shown = expanded ? matching : matching.slice(0, ROW_LIMIT);
    const total = all.reduce((sum, row) => sum + row.count, 0);
    const restEvents = matching.slice(shown.length).reduce((sum, row) => sum + row.count, 0);

    body = list.isLoading ? (
      <EventNamesTableSkeleton />
    ) : list.isError ? (
      errorState
    ) : all.length === 0 ? (
      <Message title={t("Nothing captured in this period")}>
        <p>{t("Try a different date range or filter.")}</p>
      </Message>
    ) : matching.length === 0 ? (
      noMatch
    ) : (
      <>
        <AutocaptureTable
          rows={shown}
          maxCount={Math.max(...all.map(row => row.count), 0)}
          total={total}
          valueLabel={list.valueLabel}
          links={kind === "outbound"}
        />
        <ListFooter
          shown={shown.length}
          total={matching.length}
          restEvents={restEvents}
          restShare={total > 0 ? restEvents / total : 0}
          expanded={expanded}
          onToggle={() => setExpanded(current => !current)}
        />
      </>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2.5">
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="pl-1 text-base font-semibold leading-none tracking-tight">{t("Event names")}</h2>
          <div className="max-w-full overflow-x-auto">
            <SegmentedControl
              size="sm"
              aria-label={t("Kind of event")}
              options={options}
              value={kind}
              onValueChange={next => {
                setKind(next);
                setExpanded(false);
                setSearch("");
              }}
            />
          </div>
        </div>
        <div className="w-full sm:w-56">
          <Input
            isSearch
            inputSize="sm"
            className="h-8"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={kind === "events" ? t("Search event names") : t("Search")}
            aria-label={kind === "events" ? t("Search event names") : t("Search")}
          />
        </div>
      </div>
      {body}
    </Card>
  );
}
