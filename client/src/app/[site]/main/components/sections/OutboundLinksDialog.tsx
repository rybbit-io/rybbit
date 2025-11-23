"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDebounce, useIntersectionObserver } from "@uidotdev/usehooks";
import { DateTime } from "luxon";
import { ChevronDown, ChevronUp, Loader2, Search, SquareArrowOutUpRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { OutboundLink } from "../../../../../api/analytics/events/useGetOutboundLinks";
import { cn } from "../../../../../lib/utils";

interface OutboundLinksDialogProps {
  outboundLinks: OutboundLink[];
  expanded: boolean;
  close: () => void;
}

const INITIAL_ROWS = 100;
const BATCH_SIZE = 100;

type SortKey = "url" | "count" | "percentage" | "lastClicked";

export function OutboundLinksDialog({ outboundLinks, expanded, close }: OutboundLinksDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 200);
  const [sortKey, setSortKey] = useState<SortKey>("count");
  const [sortDesc, setSortDesc] = useState<boolean>(true);
  const [visibleCount, setVisibleCount] = useState(INITIAL_ROWS);

  // Compute total for percentages
  const totalCount = useMemo(() => outboundLinks.reduce((sum, l) => sum + l.count, 0), [outboundLinks]);

  // Prepare data with percentage and filter
  const filteredAll = useMemo(() => {
    const base = outboundLinks.map(l => ({ ...l, percentage: totalCount ? (l.count / totalCount) * 100 : 0 }));
    if (!debouncedSearchTerm) return base;
    const q = debouncedSearchTerm.toLowerCase();
    return base.filter(l => l.url.toLowerCase().includes(q));
  }, [outboundLinks, totalCount, debouncedSearchTerm]);

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
        case "url":
          return mul * a.url.localeCompare(b.url);
        case "count":
          return mul * (a.count - b.count);
        case "percentage":
          return mul * (a.percentage - b.percentage);
        case "lastClicked": {
          const aMs = DateTime.fromSQL(a.lastClicked, { zone: "utc" }).toMillis();
          const bMs = DateTime.fromSQL(b.lastClicked, { zone: "utc" }).toMillis();
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
      setSortDesc(key === "count" || key === "percentage" || key === "lastClicked");
    }
  }

  return (
    <Dialog open={expanded} onOpenChange={close}>
      <DialogContent className="max-w-[1000px] w-[calc(100vw-2rem)] p-2 sm:p-4">
        <DialogHeader>
          <DialogTitle>Outbound Links</DialogTitle>
        </DialogHeader>
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-600 dark:text-neutral-400" />
          <Input
            type="text"
            placeholder={`Filter ${outboundLinks.length} links...`}
            className="pl-9 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-xs"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2 overflow-x-auto">
          <div className="max-h-[80vh] overflow-y-auto">
            <table className="w-full text-xs text-left min-w-max">
              <thead className="bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 sticky top-0 z-10">
                <tr>
                  <th
                    className="px-2 py-1 font-medium whitespace-nowrap text-left cursor-pointer select-none"
                    onClick={() => toggleSort("url")}
                  >
                    <div className="flex items-center gap-1">
                      Outbound Link
                      {sortKey === "url" &&
                        (sortDesc ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />)}
                    </div>
                  </th>
                  <th
                    className="px-2 py-1 font-medium whitespace-nowrap text-right cursor-pointer select-none"
                    onClick={() => toggleSort("count")}
                  >
                    <div className="flex items-center gap-1 justify-end">
                      Clicks
                      {sortKey === "count" &&
                        (sortDesc ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />)}
                    </div>
                  </th>
                  <th
                    className="px-2 py-1 font-medium whitespace-nowrap text-right cursor-pointer select-none"
                    onClick={() => toggleSort("percentage")}
                  >
                    <div className="flex items-center gap-1 justify-end">
                      Click %
                      {sortKey === "percentage" &&
                        (sortDesc ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />)}
                    </div>
                  </th>
                  <th
                    className="px-2 py-1 font-medium whitespace-nowrap text-right cursor-pointer select-none"
                    onClick={() => toggleSort("lastClicked")}
                  >
                    <div className="flex items-center gap-1 justify-end">
                      Last Clicked
                      {sortKey === "lastClicked" &&
                        (sortDesc ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />)}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row, rowIndex) => (
                  <tr
                    key={`${row.url}-${rowIndex}`}
                    className={cn(
                      "border-b border-neutral-300 dark:border-neutral-800 hover:bg-neutral-150 dark:hover:bg-neutral-850",
                      rowIndex % 2 === 0 ? "bg-white dark:bg-neutral-900" : "bg-neutral-50 dark:bg-neutral-950"
                    )}
                  >
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate max-w-[600px] hover:underline"
                          title={row.url}
                        >
                          {row.url}
                        </a>
                        <a href={row.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                          <SquareArrowOutUpRight
                            className="ml-0.5 w-3.5 h-3.5 text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
                            strokeWidth={3}
                          />
                        </a>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right">{row.count.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right">{row.percentage.toFixed(1)}%</td>
                    <td className="px-2 py-2 text-right text-neutral-600 dark:text-neutral-300">
                      {(() => {
                        try {
                          const dt = DateTime.fromSQL(row.lastClicked, { zone: "utc" }).toLocal();
                          return dt.toRelative();
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
                  Loading more...
                </div>
              </div>
            )}
            {!hasMore && <div className="py-4 text-center text-neutral-500 dark:text-neutral-500 text-xs">All items loaded</div>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
