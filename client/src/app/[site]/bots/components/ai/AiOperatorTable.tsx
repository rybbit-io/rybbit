"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Info } from "lucide-react";
import { useMemo, useState } from "react";
import { type BotAiSummaryRow } from "../../../../../api/analytics/endpoints";
import { useGetBotAiSummary } from "../../../../../api/analytics/hooks/bots/useGetBotAiSummary";
import { ErrorState } from "../../../../../components/ErrorState";
import { Card, CardContent, CardLoader } from "../../../../../components/ui/card";
import { ScrollArea } from "../../../../../components/ui/scroll-area";
import { Skeleton } from "../../../../../components/ui/skeleton";
import { TableSortIndicator } from "../../../../../components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../../../components/ui/tooltip";
import { useStore } from "../../../../../lib/store";
import { cn } from "../../../../../lib/utils";

const columnHelper = createColumnHelper<BotAiSummaryRow>();

const number = (value: number) => Number(value ?? 0).toLocaleString();

/**
 * The exchange rate, and the only number on the page that is an opinion rather
 * than a count. Reads as "N pages read per visit sent back"; an operator that
 * sent nobody back has no rate at all, which is worth showing as an em dash
 * rather than as a very large number or a zero.
 */
function RatioCell({ row }: { row: BotAiSummaryRow }) {
  // A rate needs both halves. An operator that sent nobody back has no rate,
  // and one that read nothing has no rate either — "0:1" would read as a
  // spectacular exchange rate rather than as an absence.
  if (!row.referrals || !row.crawls) {
    return <span className="text-neutral-500">—</span>;
  }
  return <span>{Number(row.crawls_per_referral ?? 0).toLocaleString()}:1</span>;
}

export function AiOperatorTable() {
  const { site } = useStore();
  const { data, isLoading, isFetching, error, refetch } = useGetBotAiSummary({ site });
  const [sorting, setSorting] = useState<SortingState>([{ id: "crawls", desc: true }]);

  const rows = useMemo(() => data ?? [], [data]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("operator", {
        header: "Operator",
        cell: info => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor("agent_requests", {
        header: "Agent",
        cell: info => number(info.getValue()),
      }),
      columnHelper.accessor("search_crawls", {
        header: "Answer engine",
        cell: info => number(info.getValue()),
      }),
      columnHelper.accessor("training_crawls", {
        header: "Training",
        cell: info => number(info.getValue()),
      }),
      columnHelper.accessor("crawls", {
        header: "Total reads",
        cell: info => <span className="font-medium">{number(info.getValue())}</span>,
      }),
      columnHelper.accessor("referrals", {
        header: "Visits back",
        cell: info => number(info.getValue()),
      }),
      columnHelper.accessor("crawls_per_referral", {
        header: "Reads per visit",
        cell: info => <RatioCell row={info.row.original} />,
      }),
    ],
    []
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Card>
      {isFetching && !isLoading && <CardLoader />}
      <CardContent className="p-2 md:p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <h3 className="text-sm font-medium">AI operators</h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help">
                <Info className="h-3 w-3 text-neutral-600 dark:text-neutral-300" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-sm p-3">
              <p className="text-sm text-neutral-600 dark:text-neutral-200 leading-relaxed">
                How much each company read, and how many people it sent back. Reads come from requests whose user agent
                names the operator; visits back are sessions that arrived from that company&apos;s product.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {error ? (
          <ErrorState title="Failed to load data" message={error.message} refetch={refetch} />
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full rounded-md" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-neutral-600 dark:text-neutral-300 w-full text-center py-10 flex flex-row gap-2 items-center justify-center">
            <Info className="w-5 h-5" />
            No AI traffic in this period
          </div>
        ) : (
          <ScrollArea className="max-h-[360px] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="border-b border-neutral-200 dark:border-neutral-800">
                    {headerGroup.headers.map((header, index) => (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          "py-2 px-2 text-xs font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap",
                          index === 0 ? "text-left" : "text-right"
                        )}
                      >
                        <div
                          className={cn("flex items-center gap-1", index === 0 ? "justify-start" : "justify-end")}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <TableSortIndicator sortDirection={header.column.getIsSorted()} />
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    className="border-b border-neutral-100 dark:border-neutral-850 last:border-b-0 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  >
                    {row.getVisibleCells().map((cell, index) => (
                      <td
                        key={cell.id}
                        className={cn("py-2 px-2 whitespace-nowrap", index === 0 ? "text-left" : "text-right")}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
