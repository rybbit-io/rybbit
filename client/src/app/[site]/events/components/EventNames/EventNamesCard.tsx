"use client";

import { BookOpen } from "lucide-react";
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
import { Pagination } from "@/components/pagination";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCanOnSite } from "@/hooks/usePermissions";
import { useComparisonEnabled, useStore } from "@/lib/store";
import { EventNameRow, EventNameSortKey, filterEventNameRows, sortEventNameRows } from "../../utils/eventNameRows";
import { AutocaptureRow, AutocaptureTable } from "./AutocaptureTable";
import { EventNamesSort, EventNamesTable, EventNamesTableSkeleton } from "./EventNamesTable";

type Kind = "events" | "outbound" | "button_click" | "form_submit" | "copy";

// Rows on one page of the table.
const PAGE_SIZE = 10;
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

/** The page of rows on show, and the page control under them once there is more than one. */
function pageOf<T>(rows: T[], page: number) {
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  // The rows can shrink under the page (a new period, a narrower search).
  const current = Math.min(page, pageCount);
  return { pageCount, current, shown: rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE) };
}

function PageFooter({
  page,
  pageCount,
  total,
  itemName,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  itemName: string;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  return (
    <div className="border-t border-neutral-100 px-3 py-2 dark:border-neutral-800">
      <Pagination
        page={page}
        pageCount={pageCount}
        totalItems={total}
        pageSize={PAGE_SIZE}
        onPageChange={onPageChange}
        itemName={itemName}
      />
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
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<EventNamesSort>({ key: "count", direction: "desc" });

  const goals = useGetGoals({ pageSize: GOALS_PAGE_SIZE });
  const funnels = useGetFunnels();
  const outbound = useGetOutboundLinks();
  const buttons = useGetAutocaptureEvents("button_click");
  const forms = useGetAutocaptureEvents("form_submit");
  const copies = useGetAutocaptureEvents("copy");

  const autocapture: Record<
    Exclude<Kind, "events">,
    { rows: AutocaptureRow[] | undefined; isLoading: boolean; isError: boolean; valueLabel: string; itemName: string }
  > = {
    outbound: {
      rows: outbound.data?.map(link => ({ value: String(link.url), count: link.count, lastSeen: link.lastClicked })),
      isLoading: outbound.isPending,
      isError: outbound.isError,
      valueLabel: t("Link"),
      itemName: t("links"),
    },
    button_click: {
      rows: buttons.data?.map(row => ({ value: row.value, count: row.count, lastSeen: row.lastOccurred })),
      isLoading: buttons.isPending,
      isError: buttons.isError,
      valueLabel: t("Button text"),
      itemName: t("buttons"),
    },
    form_submit: {
      rows: forms.data?.map(row => ({ value: row.value, count: row.count, lastSeen: row.lastOccurred })),
      isLoading: forms.isPending,
      isError: forms.isError,
      valueLabel: t("Form"),
      itemName: t("forms"),
    },
    copy: {
      rows: copies.data?.map(row => ({ value: row.value, count: row.count, lastSeen: row.lastOccurred })),
      isLoading: copies.isPending,
      isError: copies.isError,
      valueLabel: t("Copied text"),
      itemName: t("copies"),
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

  const changeSort = (key: EventNameSortKey) => {
    setSort(current =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: FIRST_DIRECTION[key] }
    );
    setPage(1);
  };

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
    const { pageCount, current, shown } = pageOf(matching, page);

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
        <PageFooter
          page={current}
          pageCount={pageCount}
          total={matching.length}
          itemName={t("event names")}
          onPageChange={setPage}
        />
      </>
    );
  } else {
    const list = autocapture[kind];
    const all = list.rows ?? [];
    const query = search.trim().toLowerCase();
    const matching = query ? all.filter(row => row.value.toLowerCase().includes(query)) : all;
    const { pageCount, current, shown } = pageOf(matching, page);
    const total = all.reduce((sum, row) => sum + row.count, 0);

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
        <PageFooter
          page={current}
          pageCount={pageCount}
          total={matching.length}
          itemName={list.itemName}
          onPageChange={setPage}
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
                setPage(1);
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
            onChange={event => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={kind === "events" ? t("Search event names") : t("Search")}
            aria-label={kind === "events" ? t("Search event names") : t("Search")}
          />
        </div>
      </div>
      {body}
    </Card>
  );
}
