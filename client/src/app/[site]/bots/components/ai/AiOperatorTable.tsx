"use client";

import { Filter } from "@rybbit/shared";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, ChevronsUpDown, Info } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";
import { AI_CHANNEL_FILTER } from "../../../../../api/analytics/hooks/bots/useBotFilters";
import { useGetBotAiSummary } from "../../../../../api/analytics/hooks/bots/useGetBotAiSummary";
import { useGetBotTimeSeries } from "../../../../../api/analytics/hooks/bots/useGetBotTimeSeries";
import { ErrorState } from "../../../../../components/ErrorState";
import { ChartLegend } from "../../../../../components/site/ChartLegend";
import { Delta } from "../../../../../components/site/Delta";
import { PivotActions } from "../../../../../components/site/PivotActions";
import { Badge } from "../../../../../components/ui/badge";
import { Card, CardLoader } from "../../../../../components/ui/card";
import { Input } from "../../../../../components/ui/input";
import { Skeleton } from "../../../../../components/ui/skeleton";
import { usePivotHref } from "../../../../../hooks/usePivotHref";
import { percentDelta } from "../../../../../lib/delta";
import { useStore, useTimezone } from "../../../../../lib/store";
import { cn } from "../../../../../lib/utils";
import {
  AI_PURPOSE_BY_KEY,
  AI_PURPOSE_COLORS,
  AI_PURPOSE_KEYS,
  type AiPurposeKey,
  type OperatorBot,
  type OperatorRow,
  type OperatorSortKey,
  buildOperatorRows,
  filterOperatorRows,
  formatRatio,
  sortOperatorRows,
  startedBuckets,
} from "../../botsData";
import { useAiSignups } from "../../useAiSignups";
import { Sparkline } from "../Sparkline";
import { useAiPurposeDescriptions, useAiPurposeLabels } from "./aiLabels";

// Rows shown before "Show more". The table is the page's centrepiece, not its whole length.
const VISIBLE_ROWS = 8;

// A phone keeps the operator, what it read and what it sent back. Change and the rate join from md;
// the purpose mix, pages and trend wait for xl, because the sidebar takes part of the window.
const GRID =
  "grid items-center gap-x-3 grid-cols-[16px_minmax(0,1fr)_56px_72px] md:grid-cols-[16px_minmax(0,1fr)_60px_60px_72px_92px] xl:grid-cols-[16px_minmax(0,1fr)_168px_64px_64px_76px_84px_96px_88px]";
const MID_UP = "hidden md:block";
const WIDE_ONLY = "hidden xl:block";
const MUTED = "text-neutral-500 dark:text-neutral-400";
const NEUTRAL_DELTA = "text-neutral-600 dark:text-neutral-300";

const purposeKeyOf = (purpose: string): AiPurposeKey | undefined =>
  AI_PURPOSE_KEYS.find(key => AI_PURPOSE_BY_KEY[key] === purpose);

const sourceFilters = (domains: string[]): Filter[] => [
  AI_CHANNEL_FILTER,
  { parameter: "referrer", type: "equals", value: domains },
];

/** The operator's reads as one bar, as long as its share of the busiest operator and split by purpose. */
function PurposeMix({ row, max, labels }: { row: OperatorRow; max: number; labels: Record<AiPurposeKey, string> }) {
  const track = "h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800";
  if (!row.reads || !max) return <div className={track} />;

  const description = AI_PURPOSE_KEYS.map(key => `${labels[key]} ${row[key].toLocaleString()}`).join(", ");

  return (
    <div className={track} role="img" aria-label={description} title={description}>
      <div
        className="flex h-full gap-px overflow-hidden rounded-full"
        style={{ width: `${Math.max(2.5, (row.reads / max) * 100)}%` }}
      >
        {AI_PURPOSE_KEYS.map(key =>
          row[key] > 0 ? (
            <div
              key={key}
              className="h-full"
              style={{ width: `${(row[key] / row.reads) * 100}%`, backgroundColor: AI_PURPOSE_COLORS[key] }}
            />
          ) : null
        )}
      </div>
    </div>
  );
}

function Monogram({ name }: { name: string }) {
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-neutral-100 text-[10px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function BotRow({ bot, max, labels }: { bot: OperatorBot; max: number; labels: Record<AiPurposeKey, string> }) {
  const t = useExtracted();
  const descriptions = useAiPurposeDescriptions();
  const purposeKey = purposeKeyOf(bot.purpose);
  const color = purposeKey ? AI_PURPOSE_COLORS[purposeKey] : "hsl(var(--neutral-400))";

  return (
    <div className={cn(GRID, "min-h-8 px-4 py-1 text-xs")}>
      <span />
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 md:pl-7">
        <span className="truncate font-medium text-neutral-900 dark:text-neutral-100">{bot.name}</span>
        {purposeKey && (
          <Badge
            variant="secondary"
            className="gap-1.5 whitespace-nowrap px-1.5 py-0 text-[11px] font-normal"
            title={descriptions[purposeKey]}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
            {labels[purposeKey]}
          </Badge>
        )}
      </div>
      <div className={cn(WIDE_ONLY, "h-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800")}>
        <div
          className="h-full rounded-full"
          style={{ width: `${max ? Math.max(1.5, (bot.reads / max) * 100) : 0}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-right tabular-nums text-neutral-900 dark:text-neutral-100">
        {bot.reads.toLocaleString()}
      </span>
      <span className={cn(MID_UP, "text-right")}>
        <Delta value={percentDelta(bot.reads, bot.previousReads)} className={NEUTRAL_DELTA} />
      </span>
      <span className={cn(WIDE_ONLY, "text-right tabular-nums text-neutral-600 dark:text-neutral-300")}>
        {bot.pages.toLocaleString()}
      </span>
      <span />
      <span className={MID_UP} />
      <span className="hidden justify-end xl:flex">
        <Sparkline
          values={bot.trend}
          height={18}
          fill={false}
          color="hsl(var(--neutral-400))"
          label={t("{name} reads over the period", { name: bot.name })}
        />
      </span>
    </div>
  );
}

/** The open state of an operator row: its bots, then what its product sent back. */
function OperatorDetail({ row, max, labels }: { row: OperatorRow; max: number; labels: Record<AiPurposeKey, string> }) {
  const t = useExtracted();
  const hasProduct = row.referrerDomains.length > 0;
  // Asked for only once the row is open, and only when there are visits to convert.
  const signups = useAiSignups({ referrerDomains: row.referrerDomains, enabled: hasProduct && row.visits > 0 });
  const source = row.referrerDomains.join(", ");
  const strong = (chunks: ReactNode) => (
    <span className="font-medium tabular-nums text-neutral-900 dark:text-neutral-100">{chunks}</span>
  );

  return (
    <div className="pb-2">
      {row.bots.map(bot => (
        <BotRow key={`${bot.name}:${bot.purpose}`} bot={bot} max={max} labels={labels} />
      ))}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-neutral-100 px-4 pt-2 text-xs dark:border-neutral-800 md:pl-[72px]">
        <p className="min-w-0 text-neutral-600 dark:text-neutral-300">
          {!hasProduct ? (
            t("Rybbit knows no product of this operator that refers visitors, so no visits are attributed to it.")
          ) : row.visits === 0 ? (
            t("No sessions arrived from {source} in this period.", { source })
          ) : (
            <>
              {t.rich("<b>{count, plural, one {# session} other {# sessions}}</b> arrived from <b>{source}</b>.", {
                count: row.visits,
                source,
                b: strong,
              })}{" "}
              <Delta value={percentDelta(row.visits, row.previousVisits)} className="align-baseline" />
              {signups && (
                <>
                  {" "}
                  <span title={t('Conversions of the goal "{goal}"', { goal: signups.goalName })}>
                    {t.rich("<b>{count, number}</b> signed up, {rate} against {siteRate} site-wide.", {
                      count: signups.signups,
                      rate: `${signups.rate.toFixed(1)}%`,
                      siteRate: `${signups.siteRate.toFixed(2)}%`,
                      b: strong,
                    })}
                  </span>
                </>
              )}
            </>
          )}
        </p>
        {hasProduct && row.visits > 0 && (
          <PivotActions
            filters={sourceFilters(row.referrerDomains)}
            actions={["sessions", "segment"]}
            className="shrink-0"
          />
        )}
      </div>
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  align = "right",
  className,
}: {
  label: string;
  sortKey: OperatorSortKey;
  sort: { key: OperatorSortKey; descending: boolean };
  onSort: (key: OperatorSortKey) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = sort.key === sortKey;
  const Icon = !active ? ChevronsUpDown : sort.descending ? ArrowDown : ArrowUp;

  return (
    <div className={cn(align === "right" ? "justify-end text-right" : "justify-start", className ?? "flex")}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-pressed={active}
        className={cn(
          "group inline-flex items-center gap-1 whitespace-nowrap rounded-sm hover:text-neutral-900 focus-visible:outline-none focus-visible:underline dark:hover:text-neutral-100",
          active && "text-neutral-900 dark:text-neutral-100"
        )}
      >
        {label}
        <Icon className={cn("h-3 w-3", !active && "opacity-0 group-hover:opacity-60 group-focus-visible:opacity-60")} />
      </button>
    </div>
  );
}

/**
 * What each AI company read and how many people its product sent back: the
 * page's centrepiece. A row opens to the named bots behind the operator, so
 * the separate bots list is gone.
 */
export function AiOperatorTable() {
  const t = useExtracted();
  const site = useStore(state => state.site);
  const bucket = useStore(state => state.bucket);
  const timezone = useTimezone();
  const labels = useAiPurposeLabels();
  const pivotHref = usePivotHref();

  const { data, isLoading, isFetching, error, refetch } = useGetBotAiSummary({ site, bucket });
  const { data: previous } = useGetBotAiSummary({ site, periodTime: "previous" });
  // The chart's own series, already loaded: its buckets are the axis the sparklines share.
  const { data: series } = useGetBotTimeSeries({ site, purpose: "ai" });

  const [sort, setSort] = useState<{ key: OperatorSortKey; descending: boolean }>({ key: "reads", descending: true });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const rows = useMemo(() => {
    const times = startedBuckets(series, timezone, DateTime.now()).map(point => point.time);
    return buildOperatorRows(data, previous, times);
  }, [data, previous, series, timezone]);

  const max = rows.reduce((largest, row) => Math.max(largest, row.reads), 0);
  const matching = useMemo(
    () => sortOperatorRows(filterOperatorRows(rows, search), sort.key, sort.descending),
    [rows, search, sort]
  );
  const visible = showAll || search ? matching : matching.slice(0, VISIBLE_ROWS);
  const hidden = matching.slice(visible.length);

  const onSort = (key: OperatorSortKey) =>
    setSort(current =>
      current.key === key ? { key, descending: !current.descending } : { key, descending: key !== "operator" }
    );

  const toggle = (operator: string) =>
    setOpen(current => {
      const next = new Set(current);
      if (!next.delete(operator)) next.add(operator);
      return next;
    });

  return (
    <Card>
      {isFetching && !isLoading && <CardLoader />}
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-3 px-4 pb-3 pt-3.5">
        <div className="min-w-0">
          <h2 className="font-semibold leading-none tracking-tight">{t("AI operators")}</h2>
          <p className={cn("mt-1.5 text-sm", MUTED)}>
            {t("What each company read, and how many people its product sent back.")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <ChartLegend
            className="gap-x-3"
            items={AI_PURPOSE_KEYS.map(key => ({ id: key, label: labels[key], color: AI_PURPOSE_COLORS[key] }))}
          />
          <div className="w-44">
            <Input
              isSearch
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={t("Search operators")}
              aria-label={t("Search operators")}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>

      {error && !data ? (
        <div className="border-t border-neutral-100 px-4 dark:border-neutral-800">
          <ErrorState title={t("Failed to load data")} message={error.message} refetch={refetch} />
        </div>
      ) : isLoading ? (
        <div className="space-y-2 border-t border-neutral-100 px-4 py-3 dark:border-neutral-800">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-full rounded-md" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex items-center justify-center gap-2 border-t border-neutral-100 px-4 py-10 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
          <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t("No AI system read this site in this period, and none sent a visit.")}
        </div>
      ) : (
        <div>
          <div
            className={cn(
              GRID,
              "h-8 border-t border-neutral-100 bg-neutral-50 px-4 text-xs font-medium dark:border-neutral-800 dark:bg-neutral-850",
              MUTED
            )}
          >
            <span />
            <SortHeader label={t("Operator")} sortKey="operator" sort={sort} onSort={onSort} align="left" />
            <span className={WIDE_ONLY}>{t("By purpose")}</span>
            <SortHeader label={t("Reads")} sortKey="reads" sort={sort} onSort={onSort} />
            <SortHeader label={t("Change")} sortKey="change" sort={sort} onSort={onSort} className="hidden md:flex" />
            <SortHeader
              label={t("Pages read")}
              sortKey="pages"
              sort={sort}
              onSort={onSort}
              className="hidden xl:flex"
            />
            <SortHeader label={t("Visits back")} sortKey="visits" sort={sort} onSort={onSort} />
            <SortHeader
              label={t("Reads per visit")}
              sortKey="readsPerVisit"
              sort={sort}
              onSort={onSort}
              className="hidden md:flex"
            />
            <span className={cn(WIDE_ONLY, "text-right")}>{t("Trend")}</span>
          </div>

          {visible.length === 0 && (
            <div
              className={cn("border-t border-neutral-100 px-4 py-6 text-center text-sm dark:border-neutral-800", MUTED)}
            >
              {t("No operator matches “{search}”.", { search: search.trim() })}
            </div>
          )}

          {visible.map(row => {
            const isOpen = open.has(row.operator);
            const botNames = row.bots.map(bot => bot.name).join(", ");
            return (
              <div
                key={row.operator}
                className={cn(
                  "border-t border-neutral-100 dark:border-neutral-800",
                  isOpen && "bg-neutral-50 dark:bg-neutral-850"
                )}
              >
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  onClick={() => toggle(row.operator)}
                  onKeyDown={event => {
                    if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
                    event.preventDefault();
                    toggle(row.operator);
                  }}
                  className={cn(
                    GRID,
                    "h-10 cursor-pointer px-4 text-sm transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-neutral-400 dark:hover:bg-neutral-850"
                  )}
                >
                  {isOpen ? (
                    <ChevronDown className={cn("h-4 w-4", MUTED)} aria-hidden="true" />
                  ) : (
                    <ChevronRight className={cn("h-4 w-4", MUTED)} aria-hidden="true" />
                  )}
                  <div className="flex min-w-0 items-center gap-2">
                    <Monogram name={row.operator} />
                    <span className="shrink-0 font-medium text-neutral-900 dark:text-neutral-100">{row.operator}</span>
                    <span className={cn("hidden truncate text-xs sm:inline", MUTED)}>
                      {botNames || t("No crawler seen")}
                    </span>
                  </div>
                  <div className={WIDE_ONLY}>
                    <PurposeMix row={row} max={max} labels={labels} />
                  </div>
                  <span className="text-right font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                    {row.reads.toLocaleString()}
                  </span>
                  <span className={cn(MID_UP, "text-right")}>
                    <Delta value={percentDelta(row.reads, row.previousReads)} className={NEUTRAL_DELTA} />
                  </span>
                  <span className={cn(WIDE_ONLY, "text-right tabular-nums text-neutral-600 dark:text-neutral-300")}>
                    {row.pages ? row.pages.toLocaleString() : <span className={MUTED}>—</span>}
                  </span>
                  <span className="text-right tabular-nums">
                    {row.visits > 0 && row.referrerDomains.length > 0 ? (
                      <Link
                        href={pivotHref("sessions", sourceFilters(row.referrerDomains))}
                        prefetch={false}
                        onClick={event => event.stopPropagation()}
                        title={t("View these sessions")}
                        className="text-neutral-900 underline-offset-4 hover:underline dark:text-neutral-100"
                      >
                        {row.visits.toLocaleString()}
                      </Link>
                    ) : (
                      <span className={MUTED}>{row.visits.toLocaleString()}</span>
                    )}
                  </span>
                  <span className={cn(MID_UP, "text-right tabular-nums")}>
                    {/* An operator that sent nobody back has no rate: an em dash, not a zero. */}
                    {row.readsPerVisit === null ? (
                      <span className={MUTED}>—</span>
                    ) : (
                      <span className="text-neutral-900 dark:text-neutral-100">
                        {formatRatio(row.readsPerVisit)}
                        <span className={MUTED}> : 1</span>
                      </span>
                    )}
                  </span>
                  <span className="hidden justify-end xl:flex">
                    <Sparkline values={row.trend} label={t("{name} reads over the period", { name: row.operator })} />
                  </span>
                </div>
                {isOpen && <OperatorDetail row={row} max={max} labels={labels} />}
              </div>
            );
          })}

          {(hidden.length > 0 || (showAll && !search && matching.length > VISIBLE_ROWS)) && (
            <div
              className={cn(
                "flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-neutral-100 px-4 py-2 text-xs dark:border-neutral-800",
                MUTED
              )}
            >
              <button
                type="button"
                onClick={() => setShowAll(current => !current)}
                className="inline-flex items-center gap-1.5 rounded-sm hover:text-neutral-900 focus-visible:outline-none focus-visible:underline dark:hover:text-neutral-100"
              >
                <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden="true" />
                {hidden.length > 0
                  ? t("Show {count, plural, one {# more operator} other {# more operators}}", { count: hidden.length })
                  : t("Show fewer operators")}
              </button>
              {hidden.length > 0 && (
                <span className="tabular-nums">
                  {t("{reads, number} reads · {visits, number} visits back", {
                    reads: hidden.reduce((total, row) => total + row.reads, 0),
                    visits: hidden.reduce((total, row) => total + row.visits, 0),
                  })}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
