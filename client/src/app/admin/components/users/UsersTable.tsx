"use client";

import { useMemo } from "react";
import { AdminUser } from "@/types/admin";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserTableSkeleton } from "./UserTableSkeleton";
import { userStore } from "@/lib/userStore";
import { SortableHeader } from "../shared/SortableHeader";

interface UsersTableProps {
  data: { users: AdminUser[]; total: number } | undefined;
  isLoading: boolean;
  pagination: { pageIndex: number; pageSize: number };
  setPagination: (value: { pageIndex: number; pageSize: number }) => void;
  sorting: SortingState;
  setSorting: (sorting: SortingState) => void;
  columnFilters: ColumnFiltersState;
  setColumnFilters: (filters: ColumnFiltersState) => void;
  globalFilter: string;
  setGlobalFilter: (filter: string) => void;
  onImpersonate: (userId: string) => void;
}

export function UsersTable({
  data,
  isLoading,
  pagination,
  setPagination,
  sorting,
  setSorting,
  columnFilters,
  setColumnFilters,
  globalFilter,
  setGlobalFilter,
  onImpersonate,
}: UsersTableProps) {
  // Define columns for the table
  const columns = useMemo<ColumnDef<AdminUser>[]>(
    () => [
      {
        accessorKey: "id",
        header: ({ column }) => <SortableHeader column={column}>User ID</SortableHeader>,
        cell: ({ row }) => <div className="font-mono">{row.getValue("id")}</div>,
      },
      {
        accessorKey: "name",
        header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
        cell: ({ row }) => row.getValue("name") || "N/A",
      },
      {
        accessorKey: "email",
        header: ({ column }) => <SortableHeader column={column}>Email</SortableHeader>,
        cell: ({ row }) => row.getValue("email"),
      },
      {
        accessorKey: "role",
        header: ({ column }) => <SortableHeader column={column}>Role</SortableHeader>,
        cell: ({ row }) => row.getValue("role") || "user",
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => <SortableHeader column={column}>Created At</SortableHeader>,
        cell: ({ row }) => new Date(row.getValue("createdAt")).toLocaleDateString(),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button
            onClick={() => onImpersonate(row.original.id)}
            size="sm"
            variant="outline"
            className="flex items-center gap-1"
            disabled={row.original.id === userStore.getState().user?.id}
          >
            <User className="h-4 w-4" />
            Impersonate
          </Button>
        ),
      },
    ],
    [onImpersonate]
  );

  // Initialize the table
  const table = useReactTable({
    data: data?.users || [],
    columns,
    state: {
      sorting,
      columnFilters,
      pagination,
      globalFilter,
    },
    pageCount: data ? Math.ceil(data.total / pagination.pageSize) : -1,
    onSortingChange: updater => setSorting(typeof updater === "function" ? updater(sorting) : updater),
    onColumnFiltersChange: updater =>
      setColumnFilters(typeof updater === "function" ? updater(columnFilters) : updater),
    onPaginationChange: updater => setPagination(typeof updater === "function" ? updater(pagination) : updater),
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  return (
    <div className="rounded-md border border-neutral-700">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <UserTableSkeleton rowCount={pagination.pageSize} />
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-4">
                No users found
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map(row => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
