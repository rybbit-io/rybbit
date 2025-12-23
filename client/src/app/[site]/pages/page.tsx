"use client";

import { useGetPageTitlesPaginated } from "@/api/analytics/hooks/useGetPageTitles";
import { PageTitleItem } from "@/api/analytics/endpoints";
import { Pagination } from "@/components/pagination";
import { useSetPageTitle } from "@/hooks/useSetPageTitle";
import { useStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { PageListItem } from "./components/PageListItem";
import { PageListSkeleton } from "./components/PageListSkeleton";

// Number of items per page
const PAGE_SIZE = 10;

export default function Pages() {
  const { site } = useStore();

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });
  const [totalPages, setTotalPages] = useState(0);

  useSetPageTitle("Rybbit · Pages");

  // Get page number (1-based) from pageIndex (0-based)
  const pageNumber = pagination.pageIndex + 1;

  const {
    data: apiResponse,
    isLoading: isLoadingPages,
    isError: isErrorPages,
    error: pagesError,
    isPlaceholderData,
    isFetching,
  } = useGetPageTitlesPaginated({
    limit: pagination.pageSize,
    page: pageNumber,
  });

  const pagesDataArray: PageTitleItem[] | undefined = apiResponse?.data?.data;
  const totalCount: number | undefined = apiResponse?.data?.totalCount;

  const isLoading = isLoadingPages || isFetching;

  // Create a minimal table object with the required pagination methods
  const table = {
    getState: () => ({
      pagination: {
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
      },
    }),
    getCanPreviousPage: () => pagination.pageIndex > 0,
    getCanNextPage: () => {
      if (totalCount === undefined) return true;
      return (pagination.pageIndex + 1) * pagination.pageSize < totalCount;
    },
    getPageCount: () => totalPages,
    setPageIndex: (index: number) => setPagination({ ...pagination, pageIndex: index }),
    previousPage: () => setPagination({ ...pagination, pageIndex: pagination.pageIndex - 1 }),
    nextPage: () => setPagination({ ...pagination, pageIndex: pagination.pageIndex + 1 }),
  };

  useEffect(() => {
    if (!isLoadingPages && !isPlaceholderData && !isFetching) {
      if (totalCount !== undefined) {
        setTotalPages(Math.ceil(totalCount / pagination.pageSize));
      } else if (pagesDataArray && pagesDataArray.length === 0 && pagination.pageIndex === 0) {
        // Fallback if totalCount is somehow undefined but we have an empty array on page 1
        setTotalPages(0);
      } else if (pagesDataArray && pagesDataArray.length < pagination.pageSize) {
        // Fallback: if less than a full page is returned, assume it's the last
        setTotalPages(pagination.pageIndex + 1);
      }
    } else if (pagination.pageIndex === 0 && isLoadingPages && !pagesDataArray) {
      // Initial load, no data yet
      setTotalPages(0);
    }
  }, [
    apiResponse,
    totalCount,
    pagesDataArray,
    isLoadingPages,
    isPlaceholderData,
    isFetching,
    pagination.pageIndex,
    pagination.pageSize,
  ]);

  if (!site) {
    return null;
  }

  return (
    <DisabledOverlay message="pages" featurePath="pages">
      <div className="p-2 md:p-4 max-w-[1100px] mx-auto space-y-3">
        <SubHeader />

        {isLoading ? (
          <PageListSkeleton count={pagination.pageSize} />
        ) : isErrorPages ? (
          <div className="text-center p-8 text-destructive">
            <p>Error loading pages data</p>
            <p className="text-sm">{pagesError?.toString()}</p>
          </div>
        ) : pagesDataArray && pagesDataArray.length > 0 ? (
          <>
            {pagesDataArray.map((pageItem: PageTitleItem, index: number) => (
              <PageListItem
                key={`${pageItem.value}-${index}-${pagination.pageIndex}`}
                pageData={{
                  value: pageItem.pathname,
                  title: pageItem.value,
                  count: pageItem.count,
                  percentage: pageItem.percentage,
                  time_on_page_seconds: pageItem.time_on_page_seconds,
                }}
              />
            ))}
            {totalPages > 0 && (
              <Pagination
                table={table}
                data={{ items: pagesDataArray || [], total: totalCount || 0 }}
                pagination={pagination}
                setPagination={setPagination}
                isLoading={isLoading}
                itemName="pages"
              />
            )}
          </>
        ) : !isLoadingPages && !isFetching ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No pages data found for the selected period.</p>
          </div>
        ) : null}
      </div>
    </DisabledOverlay>
  );
}
