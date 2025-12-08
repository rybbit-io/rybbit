"use client";

import { useGetErrorNamesPaginated } from "@/api/analytics/hooks/errors/useGetErrorNames";
import { ErrorNameItem } from "@/api/analytics/endpoints";
import { Pagination } from "@/components/pagination";
import { useSetPageTitle } from "@/hooks/useSetPageTitle";
import { useStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { ErrorListItem } from "./components/ErrorListItem";
import { ErrorListSkeleton } from "./components/ErrorListSkeleton";
import { EnableErrorTracking } from "./components/EnableErrorTracking";
import { NothingFound } from "../../../components/NothingFound";

// Number of items per page
const PAGE_SIZE = 10;

export default function Errors() {
  const { site } = useStore();

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });
  const [totalPages, setTotalPages] = useState(0);

  useSetPageTitle("Rybbit · Errors");

  // Get page number (1-based) from pageIndex (0-based)
  const pageNumber = pagination.pageIndex + 1;

  const {
    data: apiResponse,
    isLoading: isLoadingErrors,
    isError: isErrorErrors,
    error: errorsError,
    isPlaceholderData,
    isFetching,
  } = useGetErrorNamesPaginated({
    limit: pagination.pageSize,
    page: pageNumber,
  });

  const errorsDataArray: ErrorNameItem[] | undefined = apiResponse?.data?.data;
  const totalCount: number | undefined = apiResponse?.data?.totalCount;

  const isLoading = isLoadingErrors || isFetching;

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
    if (!isLoadingErrors && !isPlaceholderData && !isFetching) {
      if (totalCount !== undefined) {
        setTotalPages(Math.ceil(totalCount / pagination.pageSize));
      } else if (errorsDataArray && errorsDataArray.length === 0 && pagination.pageIndex === 0) {
        // Fallback if totalCount is somehow undefined but we have an empty array on page 1
        setTotalPages(0);
      } else if (errorsDataArray && errorsDataArray.length < pagination.pageSize) {
        // Fallback: if less than a full page is returned, assume it's the last
        setTotalPages(pagination.pageIndex + 1);
      }
    } else if (pagination.pageIndex === 0 && isLoadingErrors && !errorsDataArray) {
      // Initial load, no data yet
      setTotalPages(0);
    }
  }, [
    apiResponse,
    totalCount,
    errorsDataArray,
    isLoadingErrors,
    isPlaceholderData,
    isFetching,
    pagination.pageIndex,
    pagination.pageSize,
  ]);

  if (!site) {
    return null;
  }

  return (
    <DisabledOverlay message="errors" featurePath="errors">
      <div className="p-2 md:p-4 max-w-[1100px] mx-auto space-y-3">
        <SubHeader />
        <EnableErrorTracking />

        {isLoading ? (
          <ErrorListSkeleton count={pagination.pageSize} />
        ) : isErrorErrors ? (
          <div className="text-center p-8 text-destructive">
            <p>Error loading errors data</p>
            <p className="text-sm">{errorsError?.toString()}</p>
          </div>
        ) : errorsDataArray && errorsDataArray.length > 0 ? (
          <>
            {errorsDataArray.map((errorItem: ErrorNameItem, index: number) => (
              <ErrorListItem key={`${errorItem.value}-${index}-${pagination.pageIndex}`} errorData={errorItem} />
            ))}
            {totalPages > 0 && (
              <Pagination
                table={table}
                data={{ items: errorsDataArray || [], total: totalCount || 0 }}
                pagination={pagination}
                setPagination={setPagination}
                isLoading={isLoading}
                itemName="errors"
              />
            )}
          </>
        ) : !isLoadingErrors && !isFetching ? (
          <NothingFound
            title={"No error events found"}
            description={"Errors will appear here once error tracking is enabled and errors occur on your site."}
          />
        ) : null}
      </div>
    </DisabledOverlay>
  );
}
