"use client";

import { Input } from "@/components/ui/input";
import { getTimezone } from "@/lib/store";
import { useDebounce, useIntersectionObserver } from "@uidotdev/usehooks";
import { DateTime } from "luxon";
import { ChevronDown, ChevronUp, Loader2, Search } from "lucide-react";
import { useExtracted } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useDateTimeFormat } from "../../../../../hooks/useDateTimeFormat";
import { AutocaptureEvent } from "../../../../../api/analytics/endpoints";
import { cn } from "../../../../../lib/utils";

interface AutocaptureEventsDialogBodyProps {
  events: AutocaptureEvent[];
  valueLabel: string;
  countLabel: string;
  lastLabel: string;
}

const INITIAL_ROWS = 100;
const BATCH_SIZE = 100;

type SortKey = "value" | "count" | "percentage" | "lastOccurred";

export function AutocaptureEventsDialogBody({ events, valueLabel, countLabel, lastLabel }: AutocaptureEventsDialogBodyProps) {
  const t = useExtracted();
  const { formatRelative } = useDateTimeFormat();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 200);
  const [sortKey, setSortKey] = useState<SortKey>("count");
  const [sortDesc, setSortDesc] = useState<boolean>(true);
  const [visibleCount, setVisibleCount] = useState(INITIAL_ROWS);

  // Compute total for percentages
  const totalCount = useMemo(() => events.reduce((sum, e) => sum + e.count, 0), [events]);

  // Prepare data with percentage and filter
  const filteredAll = useMemo(() => {
    const base = events.map(e => ({ ...e, percentage: totalCount ? (e.count / totalCount) * 100 : 0 }));
    if (!debouncedSearchTerm) return base;
    const q = debouncedSearchTerm.toLowerCase();
    return base.filter(e => e.value.toLowerCase().includes(q));
  }, [events, totalCount, debouncedSearchTerm]);

  // Reset visible rows when filter changes
  useEffect(() => {
    setVisibleCount(INITIAL_ROWS);
  }, [debouncedSearchTerm]);

  // Intersection observer to grow visible rows
  const [ref, entry] = useIntersectionObserver({ threshold: 0, root: null, rootMargin: "0px 0px 200px 0px" });
  const hasMore = visibleCount < filteredAll.length;
  useEffect(() => {
    if (entry?.isIntersecting && hasMore) {
      setVisibleCount(c => Math.min(c + BATCH_SIZE, filteredAll.length));
    }
  }, [entry?.isIntersecting, hasMore, filteredAll.length]);

  const sorted = useMemo(() => {
    const arr = filteredAll.slice();
    arr.sort((a, b) => {
      const mul = sortDesc ? -1 : 1;
      switch (sortKey) {
        case "value":
          return mul * a.value.localeCompare(b.value);
        case "count":
          return mul * (a.count - b.count);
        case "percentage":
          return mul * (a.percentage - b.percentage);
        case "lastOccurred": {
          const aMs = DateTime.fromSQL(a.lastOccurred, { zone: "utc" }).toMillis();
          const bMs = DateTime.fromSQL(b.lastOccurred, { zone: "utc" }).toMillis();
          return mul * (aMs - bMs);
        }
      }
    });
    return arr;
  }, [filteredAll, sortKey, sortDesc]);

  const visible = sorted.slice(0, visibleCount);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDesc(d => !d);
    } else {
      setSortKey(key);
      setSortDesc(key === "count" || key === "percentage" || key === "lastOccurred");
    }
  }

  const headers: { key: SortKey; label: string; align: "left" | "right" }[] = [
    { key: "value", label: valueLabel, align: "left" },
    { key: "count", label: countLabel, align: "right" },
    { key: "percentage", label: "%", align: "right" },
    { key: "lastOccurred", label: lastLabel, align: "right" },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-600 dark:text-neutral-400" />
        <Input
          type="text"
          placeholder={t("Filter {count} items...", { count: String(events.length) })}
          className="pl-9 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-xs"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-x-auto">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full text-xs text-left min-w-max">
            <thead className="bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 sticky top-0 z-10">
              <tr>
                {headers.map(header => (
                  <th
                    key={header.key}
                    className={cn(
                      "px-2 py-1 font-medium whitespace-nowrap cursor-pointer select-none",
                      header.align === "right" ? "text-right" : "text-left"
                    )}
                    onClick={() => toggleSort(header.key)}
                  >
                    <div className={cn("flex items-center gap-1", header.align === "right" && "justify-end")}>
                      {header.label}
                      {sortKey === header.key &&
                        (sortDesc ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row, rowIndex) => (
                <tr
                  key={`${row.value}-${rowIndex}`}
                  className={cn(
                    "border-b border-neutral-300 dark:border-neutral-800 hover:bg-neutral-150 dark:hover:bg-neutral-850",
                    rowIndex % 2 === 0 ? "bg-white dark:bg-neutral-900" : "bg-neutral-50 dark:bg-neutral-950"
                  )}
                >
                  <td className="p-2">
                    <div className="truncate max-w-[600px]" title={row.value}>
                      {row.value}
                    </div>
                  </td>
                  <td className="p-2 text-right">{row.count.toLocaleString()}</td>
                  <td className="p-2 text-right">{row.percentage.toFixed(1)}%</td>
                  <td className="p-2 text-right text-neutral-600 dark:text-neutral-300">
                    {(() => {
                      try {
                        const dt = DateTime.fromSQL(row.lastOccurred, { zone: "utc" }).setZone(getTimezone());
                        return formatRelative(dt);
                      } catch {
                        return "-";
                      }
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAll.length > visibleCount && (
            <div ref={ref} className="py-4 flex justify-center">
              <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 text-xs">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("Loading more...")}
              </div>
            </div>
          )}
          {!hasMore && (
            <div className="py-4 text-center text-neutral-500 dark:text-neutral-500 text-xs">{t("All items loaded")}</div>
          )}
        </div>
      </div>
    </div>
  );
}
