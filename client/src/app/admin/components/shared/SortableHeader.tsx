"use client";

import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Column } from "@tanstack/react-table";

interface SortableHeaderProps<TData> {
  column: Column<TData, unknown>;
  children: React.ReactNode;
  className?: string;
}

export function SortableHeader<TData>({
  column,
  children,
  className = "p-0 hover:bg-transparent",
}: SortableHeaderProps<TData>) {
  const sortDirection = column.getIsSorted();

  return (
    <Button variant="ghost" onClick={() => column.toggleSorting(sortDirection === "asc")} className={className}>
      {children}
      {sortDirection === "asc" ? (
        <ArrowUp className="ml-2 h-4 w-4" />
      ) : sortDirection === "desc" ? (
        <ArrowDown className="ml-2 h-4 w-4" />
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4" />
      )}
    </Button>
  );
}
