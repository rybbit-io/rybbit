import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useDebounce } from "@uidotdev/usehooks";
import { ChevronDown, ChevronUp, Loader2, Search } from "lucide-react";
import { ReactNode, useMemo, useState } from "react";
import { GSCData, GSCDimension, useGSCData } from "../../../../../api/gsc/useGSCData";
import { cn } from "../../../../../lib/utils";

interface SearchConsoleDialogProps {
  title: string;
  dimension: GSCDimension;
  renderName?: (name: string) => ReactNode;
  expanded?: boolean;
  close: () => void;
}

const columnHelper = createColumnHelper<GSCData>();

export function SearchConsoleDialog({ title, dimension, renderName, expanded, close }: SearchConsoleDialogProps) {
  const { data, isLoading } = useGSCData(dimension);

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 200);
  const [sorting, setSorting] = useState<SortingState>([{ id: "clicks", desc: true }]);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!data) return [];

    return data.filter((item: GSCData) => {
      return String(item.name).toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    });
  }, [data, debouncedSearchTerm]);

  const columns = useMemo(() => {
    const cols = [
      columnHelper.accessor("name", {
        header: title,
        cell: ({ row }) => (
          <div className="flex flex-row gap-1 items-center text-left">
            {renderName ? renderName(row.original.name) : row.original.name}
          </div>
        ),
      }),
      columnHelper.accessor("clicks", {
        header: "Clicks",
        cell: info => (
          <div className="flex flex-row gap-1 items-center sm:justify-end">{info.getValue().toLocaleString()}</div>
        ),
      }),
      columnHelper.accessor("impressions", {
        header: "Impressions",
        cell: info => (
          <div className="flex flex-row gap-1 items-center sm:justify-end">{info.getValue().toLocaleString()}</div>
        ),
      }),
      columnHelper.accessor("ctr", {
        header: "CTR",
        cell: info => (
          <div className="flex flex-row gap-1 items-center sm:justify-end">{(info.getValue() * 100).toFixed(1)}%</div>
        ),
      }),
      columnHelper.accessor("position", {
        header: "Position",
        cell: info => (
          <div className="flex flex-row gap-1 items-center sm:justify-end">{info.getValue().toFixed(1)}</div>
        ),
      }),
    ];

    return cols;
  }, [title, dimension, renderName]);

  // Set up table instance
  const table = useReactTable({
    data: filteredData || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    manualSorting: false,
    sortDescFirst: true,
  });

  if (isLoading || !data) {
    return (
      <Dialog open={expanded} onOpenChange={close}>
        <DialogContent className="max-w-[1000px] w-[calc(100vw-2rem)] p-2 sm:p-4">
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-600 dark:text-neutral-400" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={expanded} onOpenChange={close}>
      <DialogContent className="max-w-[1000px] w-[calc(100vw-2rem)] p-2 sm:p-4">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-600 dark:text-neutral-400" />
          <Input
            type="text"
            placeholder={`Filter ${data.length} items...`}
            className="pl-9 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-xs"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2 overflow-x-auto">
          <div className="max-h-[80vh] overflow-y-auto">
            <table className="w-full text-xs text-left min-w-max">
              <thead className="bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 sticky top-0 z-10">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header, index) => (
                      <th
                        key={header.id}
                        scope="col"
                        className={cn(
                          "px-2 py-1 font-medium whitespace-nowrap cursor-pointer select-none",
                          index === 0 ? "text-left" : "text-right"
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className={cn("flex items-center gap-1", index !== 0 && "justify-end")}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: <ChevronUp className="h-3 w-3" />,
                            desc: <ChevronDown className="h-3 w-3" />,
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row, rowIndex) => {
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-b border-neutral-300 dark:border-neutral-800 hover:bg-neutral-150 dark:hover:bg-neutral-850",
                        rowIndex % 2 === 0 ? "bg-white dark:bg-neutral-900" : "bg-neutral-50 dark:bg-neutral-950"
                      )}
                    >
                      {row.getVisibleCells().map((cell, cellIndex) => (
                        <td key={cell.id} className={cn("px-2 py-2 relative", cellIndex !== 0 && "text-right")}>
                          <span className="relative z-0">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </span>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredData.length === 0 && (
              <div className="py-8 text-center text-neutral-500 dark:text-neutral-500 text-xs">No results found</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
