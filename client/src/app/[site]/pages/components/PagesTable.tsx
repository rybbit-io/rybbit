"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useGetSite } from "@/api/admin/hooks/useSites";
import { useGetOverviewBucketed } from "@/api/analytics/hooks/useGetOverviewBucketed";
import { useGetPageTitlesPaginated } from "@/api/analytics/hooks/useGetPageTitles";
import { PageTitleItem } from "@/api/analytics/endpoints";
import { ErrorState } from "@/components/ErrorState";
import { Pagination } from "@/components/pagination";
import { useStore } from "@/lib/store";
import { formatShortDuration } from "@/lib/dateTimeUtils";
import { cn, truncateString } from "@/lib/utils";
import { PageSparklineChart } from "./PageSparklineChart";

const PAGE_SIZE = 25;
const MAX_TITLE_LENGTH = 80;

const columnHelper = createColumnHelper<PageTitleItem>();

function ChangePercentage({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) {
    if (current === 0) return null;
    return <span className="text-xs text-green-400">+999%</span>;
  }
  const change = ((current - previous) / previous) * 100;
  if (change === 0) return <span className="text-xs text-foreground/50">0%</span>;
  const isPositive = change > 0;
  return (
    <span className={cn("text-xs inline-flex items-center", isPositive ? "text-green-400" : "text-red-400")}>
      {isPositive ? "+" : ""}
      {change.toFixed(1)}%
    </span>
  );
}

function TrendCell({ pageItem }: { pageItem: PageTitleItem }) {
  const { site, bucket, time } = useStore();
  const [isHovering, setIsHovering] = useState(false);
  const isPastMinutesMode = time.mode === "past-minutes";

  const { data: regularData, isLoading: isLoadingRegular } = useGetOverviewBucketed({
    site,
    bucket,
    dynamicFilters: [{ parameter: "page_title", value: [pageItem.value], type: "equals" }],
    props: { enabled: !isPastMinutesMode },
  });

  const { data: pastMinutesData, isLoading: isLoadingPastMinutes } = useGetOverviewBucketed({
    site,
    bucket,
    dynamicFilters: [{ parameter: "pathname", value: [pageItem.pathname], type: "equals" }],
    props: { enabled: isPastMinutesMode },
  });

  const data = isPastMinutesMode ? pastMinutesData : regularData;
  const isLoading = isPastMinutesMode ? isLoadingPastMinutes : isLoadingRegular;

  return (
    <div
      className="h-8 w-32"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <PageSparklineChart
        data={data}
        isHovering={isHovering}
        pageTitle={pageItem.value}
        isLoading={isLoading}
      />
    </div>
  );
}

export function PagesTable() {
  const t = useExtracted();
  const { site } = useStore();
  const { data: siteMetadata } = useGetSite();

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  const page = pagination.pageIndex + 1;

  const {
    data: currentResp,
    isLoading: isLoadingCurrent,
    isFetching: isFetchingCurrent,
    isError,
  } = useGetPageTitlesPaginated({
    limit: pagination.pageSize,
    page,
  });

  const { data: previousResp } = useGetPageTitlesPaginated({
    limit: 1000,
    page: 1,
    periodTime: "previous",
  });

  const currentItems = currentResp?.data?.data ?? [];
  const totalCount = currentResp?.data?.totalCount ?? 0;

  const previousByValue = useMemo(() => {
    const map = new Map<string, PageTitleItem>();
    for (const item of previousResp?.data?.data ?? []) {
      map.set(item.value, item);
    }
    return map;
  }, [previousResp]);

  const isLoading = isLoadingCurrent || isFetchingCurrent;

  const columns = [
    columnHelper.accessor("value", {
      header: t("Page"),
      cell: info => {
        const item = info.row.original;
        const title = item.value;
        const pathname = item.pathname;
        const pageUrl = siteMetadata?.domain ? `https://${siteMetadata.domain}${pathname}` : "";

        return (
          <div className="min-w-0 max-w-[420px]">
            <div className="flex items-center gap-1.5">
              <span
                className="text-sm font-medium truncate text-foreground"
                title={title}
              >
                {truncateString(title || pathname, MAX_TITLE_LENGTH)}
              </span>
              {pageUrl && (
                <Link
                  href={pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-muted-foreground hover:text-primary shrink-0"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate" title={pathname}>
              {pathname}
            </p>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "trend",
      header: t("Trend"),
      cell: ({ row }) => <TrendCell pageItem={row.original} />,
    }),
    columnHelper.accessor("pageviews", {
      header: t("Views"),
      cell: info => {
        const v = info.getValue();
        return <div className="whitespace-nowrap">{(v ?? 0).toLocaleString()}</div>;
      },
    }),
    columnHelper.accessor("count", {
      header: t("Sessions"),
      cell: info => {
        const current = info.getValue() ?? 0;
        const prev = previousByValue.get(info.row.original.value)?.count ?? 0;
        return (
          <div className="whitespace-nowrap flex items-center gap-1.5">
            <span>{current.toLocaleString()}</span>
            <ChangePercentage current={current} previous={prev} />
          </div>
        );
      },
    }),
    columnHelper.accessor("bounce_rate", {
      header: t("Bounce"),
      cell: info => {
        const v = info.getValue();
        if (v === undefined || v === null) return <div className="text-muted-foreground">—</div>;
        return <div className="whitespace-nowrap">{Math.round(v)}%</div>;
      },
    }),
    columnHelper.accessor("time_on_page_seconds", {
      header: t("Duration"),
      cell: info => {
        const v = info.getValue();
        if (v === undefined || v === null) return <div className="text-muted-foreground">—</div>;
        return <div className="whitespace-nowrap">{formatShortDuration(v)}</div>;
      },
    }),
  ];

  const table = useReactTable({
    data: currentItems,
    columns,
    pageCount: totalCount ? Math.ceil(totalCount / pagination.pageSize) : -1,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
  });

  if (isError) {
    return (
      <ErrorState
        title={t("Failed to load pages")}
        message={t("There was a problem fetching the pages. Please try again later.")}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="[&_tr]:border-b-0 bg-neutral-50 dark:bg-neutral-850">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    scope="col"
                    className="h-8 px-3 text-left align-middle font-medium text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap first:rounded-l-xl last:rounded-r-xl"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading && currentItems.length === 0 ? (
              Array.from({ length: 10 }).map((_, index) => (
                <tr key={index} className="border-b border-neutral-100 dark:border-neutral-800 animate-pulse">
                  <td className="px-3 py-2">
                    <div className="space-y-1.5 max-w-[420px]">
                      <div className="h-3.5 bg-neutral-200 dark:bg-neutral-800 rounded w-3/5"></div>
                      <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-2/5 opacity-70"></div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="h-8 w-32 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="h-3.5 w-10 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <div className="h-3.5 w-10 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
                      <div className="h-3 w-8 bg-neutral-200 dark:bg-neutral-800 rounded opacity-70"></div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="h-3.5 w-8 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="h-3.5 w-8 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
                  </td>
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-7 text-center text-neutral-500 dark:text-neutral-400"
                >
                  {t("No pages data found for the selected period.")}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className="border-b border-neutral-100 dark:border-neutral-800 group hover:bg-neutral-50 dark:hover:bg-neutral-850"
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-3 py-2 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4">
        <Pagination
          table={table}
          data={{ items: currentItems, total: totalCount }}
          pagination={pagination}
          setPagination={setPagination}
          isLoading={isLoading}
          itemName={t("pages")}
        />
      </div>
    </div>
  );
}
