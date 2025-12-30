import * as React from "react";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  )
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("[&_tr]:border-b-0 bg-neutral-50 dark:bg-neutral-850", className)} {...props} />
  )
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0 bg-white dark:bg-neutral-900", className)} {...props} />
  )
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot
      ref={ref}
      className={cn("border-t bg-neutral-100/50 font-normal [&>tr]:last:border-b-0 dark:bg-neutral-800/50", className)}
      {...props}
    />
  )
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b border-b-neutral-100 transition-colors hover:bg-neutral-0 data-[state=selected]:bg-neutral-100 dark:border-b-neutral-800 dark:hover:bg-neutral-800/20 dark:data-[state=selected]:bg-neutral-800",
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-10 px-2 text-left align-middle font-medium text-neutral-500 [&:has([role=checkbox])]:pr-0 *:[role=checkbox]:translate-y-[2px] dark:text-neutral-400 first:rounded-l-lg last:rounded-r-lg",
        className
      )}
      {...props}
    />
  )
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn("p-2 align-middle [&:has([role=checkbox])]:pr-0 *:[role=checkbox]:translate-y-[2px]", className)}
      {...props}
    />
  )
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn("mt-4 text-sm text-neutral-500 dark:text-neutral-400", className)} {...props} />
  )
);
TableCaption.displayName = "TableCaption";

interface TableSortIndicatorProps {
  /** The current sort direction: 'asc', 'desc', or false/undefined for unsorted */
  sortDirection?: false | "asc" | "desc";
  /** Whether sorting is enabled for this column */
  canSort?: boolean;
  className?: string;
}

const TableSortIndicator = ({ sortDirection, canSort = true, className }: TableSortIndicatorProps) => {
  if (!canSort) return null;

  return (
    <div className={cn("flex flex-col", className)}>
      {sortDirection === "asc" ? (
        <ChevronUp className="h-3 w-3 text-blue-400" />
      ) : sortDirection === "desc" ? (
        <ChevronDown className="h-3 w-3 text-blue-400" />
      ) : (
        <ChevronsUpDown className="h-3 w-3 text-neutral-400" />
      )}
    </div>
  );
};
TableSortIndicator.displayName = "TableSortIndicator";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption, TableSortIndicator };
