"use client";

import { Table } from "@tanstack/react-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useExtracted } from "next-intl";

// Minimal slice of the TanStack table API the table-driven usage relies on.
interface PaginationController {
  getState: () => { pagination: { pageIndex: number; pageSize: number } };
  getCanPreviousPage: () => boolean;
  getCanNextPage: () => boolean;
  getPageCount: () => number;
  setPageIndex: (index: number) => void;
  previousPage: () => void;
  nextPage: () => void;
}

interface PaginationProps<TData = unknown> {
  // --- Table-driven usage (TanStack table or compatible controller) ---
  table?: Table<TData> | PaginationController;
  data?: { items: TData[]; total: number };
  pagination?: { pageIndex: number; pageSize: number };
  setPagination?: (value: { pageIndex: number; pageSize: number }) => void;

  // --- Controlled usage (plain lists). `page` is 1-indexed. ---
  page?: number;
  /** Total number of pages. Omit for open-ended lists where the total is unknown. */
  pageCount?: number;
  /** Total number of items, used for the "Showing x to y of z" summary. */
  totalItems?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  /** Override the derived prev/next availability (needed for open-ended lists). */
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;

  // --- Presentation ---
  itemName?: string;
  isLoading?: boolean;
  /** Defaults to true when a page-size handler is available. */
  showPageSizeSelector?: boolean;
  /** Defaults to true when the total page count is known. */
  showFirstLast?: boolean;
  /** Defaults to true when both total and page size are known. */
  showRange?: boolean;
  pageSizeOptions?: number[];
  className?: string;
}

// A single cell inside the segmented control. Plain button so it inherits the
// pill's hairline seams instead of fighting the Button component's own border.
function NavCell({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center text-neutral-600 transition-colors",
        "hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500",
        "disabled:pointer-events-none disabled:text-neutral-300 dark:disabled:text-neutral-700",
        "[&_svg]:size-4"
      )}
    >
      {children}
    </button>
  );
}

export function Pagination<TData>({
  table,
  data,
  pagination,
  setPagination,
  page,
  pageCount,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  hasPreviousPage,
  hasNextPage,
  itemName = "items",
  isLoading = false,
  showPageSizeSelector,
  showFirstLast,
  showRange,
  pageSizeOptions = [10, 25, 50, 100],
  className,
}: PaginationProps<TData>) {
  const t = useExtracted();

  // Normalize the two entry points into a single internal model so the markup
  // below never has to branch on where the state came from.
  let pageIndex: number;
  let resolvedPageCount: number | undefined;
  let total: number | undefined;
  let size: number | undefined;
  let canPrev: boolean;
  let canNext: boolean;
  let goToFirst: () => void;
  let goToPrev: () => void;
  let goToNext: () => void;
  let goToLast: () => void;
  let setSize: ((size: number) => void) | undefined;

  if (table) {
    const state = table.getState().pagination;
    pageIndex = state.pageIndex;
    resolvedPageCount = Math.max(table.getPageCount(), 1);
    total = data?.total;
    size = pagination?.pageSize ?? state.pageSize;
    canPrev = table.getCanPreviousPage();
    canNext = table.getCanNextPage();
    goToFirst = () => table.setPageIndex(0);
    goToPrev = () => table.previousPage();
    goToNext = () => table.nextPage();
    goToLast = () => table.setPageIndex(table.getPageCount() - 1);
    setSize = setPagination ? newSize => setPagination({ pageIndex: 0, pageSize: newSize }) : undefined;
  } else {
    const current = page ?? 1;
    pageIndex = current - 1;
    resolvedPageCount = pageCount;
    total = totalItems;
    size = pageSize;
    canPrev = hasPreviousPage ?? current > 1;
    canNext = hasNextPage ?? (resolvedPageCount != null ? current < resolvedPageCount : false);
    goToFirst = () => onPageChange?.(1);
    goToPrev = () => onPageChange?.(current - 1);
    goToNext = () => onPageChange?.(current + 1);
    goToLast = () => resolvedPageCount != null && onPageChange?.(resolvedPageCount);
    setSize = onPageSizeChange;
  }

  const currentPage = pageIndex + 1;
  const withFirstLast = showFirstLast ?? resolvedPageCount != null;
  const withPageSize = showPageSizeSelector ?? !!setSize;
  const withRange = showRange ?? (total != null && size != null);

  const from = total && size ? pageIndex * size + 1 : 0;
  const to = total != null && size != null ? Math.min((pageIndex + 1) * size, total) : 0;

  return (
    <div className={cn("flex w-full items-center gap-3", className)}>
      {withRange && (
        <div className="hidden text-sm tabular-nums text-neutral-500 dark:text-neutral-400 md:block">
          {isLoading
            ? t("Loading {items}...", { items: itemName })
            : t("Showing {from} to {to} of {total} {items}", {
                from: String(from),
                to: String(to),
                total: String(total ?? 0),
                items: itemName,
              })}
        </div>
      )}

      <div className="ml-auto flex items-center gap-3">
        {withPageSize && setSize && size != null && (
          <div className="hidden items-center gap-2 md:flex">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">{t("Page size:")}</span>
            <Select value={String(size)} onValueChange={value => setSize?.(Number(value))}>
              <SelectTrigger className="h-8 w-[4.25rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map(option => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Segmented control: one flat pill with hairline seams between cells. */}
        <div className="inline-flex items-center divide-x divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900/50">
          {withFirstLast && (
            <NavCell onClick={goToFirst} disabled={!canPrev || isLoading} label={t("First page")}>
              <ChevronsLeft />
            </NavCell>
          )}
          <NavCell onClick={goToPrev} disabled={!canPrev || isLoading} label={t("Previous page")}>
            <ChevronLeft />
          </NavCell>

          <div className="flex h-8 min-w-[3.5rem] select-none items-center justify-center px-3 text-sm tabular-nums">
            {isLoading ? (
              <span className="text-neutral-400 dark:text-neutral-500">…</span>
            ) : resolvedPageCount != null ? (
              <span
                aria-label={t("Page {current} of {total}", {
                  current: String(currentPage),
                  total: String(Math.max(resolvedPageCount, 1)),
                })}
              >
                <span className="font-medium text-neutral-900 dark:text-neutral-100">{currentPage}</span>
                <span className="text-neutral-400 dark:text-neutral-500">
                  {" "}
                  / {Math.max(resolvedPageCount, 1)}
                </span>
              </span>
            ) : (
              <span className="text-neutral-600 dark:text-neutral-300">
                {t("Page {page}", { page: String(currentPage) })}
              </span>
            )}
          </div>

          <NavCell onClick={goToNext} disabled={!canNext || isLoading} label={t("Next page")}>
            <ChevronRight />
          </NavCell>
          {withFirstLast && (
            <NavCell onClick={goToLast} disabled={!canNext || isLoading} label={t("Last page")}>
              <ChevronsRight />
            </NavCell>
          )}
        </div>
      </div>
    </div>
  );
}
