"use client";

import { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useExtracted } from "next-intl";

// Simplified pagination controller interface
interface PaginationController {
  getState: () => { pagination: { pageIndex: number; pageSize: number } };
  getCanPreviousPage: () => boolean;
  getCanNextPage: () => boolean;
  getPageCount: () => number;
  setPageIndex: (index: number) => void;
  previousPage: () => void;
  nextPage: () => void;
}

interface PaginationProps<TData> {
  table: Table<TData> | PaginationController;
  data: { items: TData[]; total: number } | undefined;
  pagination: { pageIndex: number; pageSize: number };
  setPagination: (value: { pageIndex: number; pageSize: number }) => void;
  isLoading: boolean;
  itemName?: string;
}

export function Pagination<TData>({
  table,
  data,
  pagination,
  setPagination,
  isLoading,
  itemName = "items",
}: PaginationProps<TData>) {
  const t = useExtracted();
  return (
    <div className="flex items-center justify-between">
      <div className="hidden text-sm text-neutral-400 md:block">
        {isLoading ? (
          <span>{t("Loading {items}...", { items: itemName })}</span>
        ) : (
          <span>
            {t("Showing {from} to {to} of {total} {items}", {
              from: String(data?.items?.length ? pagination.pageIndex * pagination.pageSize + 1 : 0),
              to: String(data?.items?.length ? Math.min((pagination.pageIndex + 1) * pagination.pageSize, data?.total || 0) : 0),
              total: String(data?.total || 0),
              items: itemName,
            })}
          </span>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <div className="mr-4 hidden items-center space-x-2 md:flex">
          <span className="text-sm text-neutral-400">{t("Page size:")}</span>
          <Select
            value={pagination.pageSize.toString()}
            onValueChange={value => {
              setPagination({
                pageIndex: 0, // Reset to first page when changing page size
                pageSize: Number(value),
              });
            }}
          >
            <SelectTrigger className="h-8 w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage() || isLoading}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage() || isLoading}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm text-neutral-400">
          {isLoading ? (
            <span>{t("Loading...")}</span>
          ) : (
            <span>
              {t("Page {current} of {total}", {
                current: String(table.getState().pagination.pageIndex + 1),
                total: String(Math.max(table.getPageCount(), 1)),
              })}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage() || isLoading}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage() || isLoading}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
