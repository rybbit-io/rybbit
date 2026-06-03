"use client";

import type { DashboardCard, DashboardVizType } from "@rybbit/shared";
import { useMemo, useState } from "react";
import { useDashboardCard } from "../../../../api/analytics/hooks/useDashboardCard";
import { Button } from "../../../../components/ui/button";
import { ButtonGroup } from "../../../../components/ui/button-group";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { MultiSelect } from "../../../../components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "../../../../components/ui/sheet";
import { BarChart3, LineChart, Loader2, Table2 } from "lucide-react";
import { QueryEditor } from "../../query/components/QueryEditor";
import { ResultsTable } from "../../query/components/ResultsTable";
import type { SortState } from "../../query/types";
import { formatQuery, getColumns, sortRows } from "../../query/utils";
import {
  DASHBOARD_EXAMPLES,
  DASHBOARD_EXAMPLE_CATEGORIES,
  type DashboardExample,
} from "../examples";
import { DashboardBarChart } from "./charts/DashboardBarChart";
import { DashboardLineChart } from "./charts/DashboardLineChart";

type DashboardCardEditorProps = {
  siteId: number;
  card: DashboardCard;
  open: boolean;
  onClose: () => void;
  onSave: (card: DashboardCard) => void;
};

const NONE_VALUE = "__none__";

const VIZ_OPTIONS: { value: DashboardVizType; label: string; icon: typeof LineChart }[] = [
  { value: "line", label: "Line", icon: LineChart },
  { value: "bar", label: "Bar", icon: BarChart3 },
  { value: "table", label: "Table", icon: Table2 },
];

export function DashboardCardEditor({ siteId, card, open, onClose, onSave }: DashboardCardEditorProps) {
  const [title, setTitle] = useState(card.title);
  const [sql, setSql] = useState(card.sql);
  const [vizType, setVizType] = useState<DashboardVizType>(card.vizType);
  const [xColumn, setXColumn] = useState(card.mapping.xColumn);
  const [yColumns, setYColumns] = useState<string[]>(card.mapping.yColumns ?? []);
  const [seriesColumn, setSeriesColumn] = useState(card.mapping.seriesColumn);
  const [previewSql, setPreviewSql] = useState("");

  const [sort, setSort] = useState<SortState>(null);

  const { data, isFetching, error } = useDashboardCard(siteId, `${card.id}-preview`, previewSql, !!previewSql);
  const rows = data?.data ?? [];
  const columns = useMemo(() => getColumns(rows), [rows]);
  const activeSort = sort && columns.includes(sort.column) ? sort : null;
  const sortedRows = useMemo(() => sortRows(rows, activeSort), [rows, activeSort]);
  const truncated = data?.meta && data.meta.rowCount >= data.meta.maxRows;
  const hasChartMapping = !!xColumn && yColumns.length > 0;

  const applyExample = (example: DashboardExample) => {
    setSql(example.sql);
    setVizType(example.vizType);
    setXColumn(example.mapping.xColumn);
    setYColumns(example.mapping.yColumns ?? []);
    setSeriesColumn(example.mapping.seriesColumn);
    // Only overwrite the title if the user hasn't named the card yet.
    if (!title.trim() || /^Card \d+$/.test(title.trim())) {
      setTitle(example.title);
    }
    setPreviewSql(example.sql);
  };

  const handleSave = () => {
    onSave({
      ...card,
      title: title.trim() || card.title,
      sql,
      vizType,
      mapping: vizType === "table" ? {} : { xColumn, yColumns, seriesColumn },
    });
    onClose();
  };

  const isChart = vizType === "line" || vizType === "bar";

  return (
    <Sheet open={open} onOpenChange={value => !value && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Edit card</SheetTitle>
        </SheetHeader>

        <div className="space-y-1.5">
          <Label htmlFor="card-title">Title</Label>
          <Input id="card-title" value={title} onChange={event => setTitle(event.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Start from an example</Label>
          <Select
            value=""
            onValueChange={value => {
              const example = DASHBOARD_EXAMPLES.find(item => item.id === value);
              if (example) applyExample(example);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pick an example query…" />
            </SelectTrigger>
            <SelectContent className="max-h-[420px]">
              {DASHBOARD_EXAMPLE_CATEGORIES.map(category => (
                <SelectGroup key={category}>
                  <SelectLabel>{category}</SelectLabel>
                  {DASHBOARD_EXAMPLES.filter(example => example.category === category).map(example => (
                    <SelectItem key={example.id} value={example.id}>
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1.5">
                          {example.title}
                          {example.beyondPrebuilt && (
                            <span className="rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                              advanced
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-neutral-500">{example.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-neutral-500">
            <span className="font-medium text-emerald-600 dark:text-emerald-400">Advanced</span> examples cover analyses
            not available on the prebuilt pages (entry/exit pages, funnels, web-vitals percentiles, and more).
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Query</Label>
          <QueryEditor
            value={sql}
            disabled={false}
            isRunning={isFetching}
            onChange={setSql}
            onFormat={() => setSql(formatQuery(sql))}
            onRun={() => setPreviewSql(sql)}
          />
          <p className="text-[11px] text-neutral-500">
            Queries read from <code className="font-mono">scoped_events</code> and are automatically filtered to the
            global time range. Use <code className="font-mono">{"{{bucket}}"}</code> for the selected granularity, e.g.{" "}
            <code className="font-mono">toStartOfInterval(timestamp, INTERVAL {"{{bucket}}"})</code>.
          </p>
          {error && <p className="text-xs text-red-500">{error instanceof Error ? error.message : "Query failed"}</p>}
        </div>

        {previewSql && !error && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Preview</Label>
              {isFetching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" />
              ) : (
                <span className="text-[11px] text-neutral-500">
                  {data?.meta.rowCount ?? 0} {data?.meta.rowCount === 1 ? "row" : "rows"}
                </span>
              )}
              {truncated && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                  limited to {data?.meta.maxRows}
                </span>
              )}
            </div>

            {isChart && (
              <div className="h-56 rounded-lg border border-neutral-150 p-1 dark:border-neutral-850">
                {hasChartMapping ? (
                  vizType === "line" ? (
                    <DashboardLineChart rows={rows} mapping={{ xColumn, yColumns, seriesColumn }} />
                  ) : (
                    <DashboardBarChart rows={rows} mapping={{ xColumn, yColumns, seriesColumn }} />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-neutral-500">
                    Map the X axis and Y values below to preview the chart
                  </div>
                )}
              </div>
            )}

            <div className="flex h-64 flex-col overflow-hidden rounded-lg border border-neutral-150 dark:border-neutral-850">
              {isFetching && rows.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                </div>
              ) : rows.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-neutral-500">No rows returned</div>
              ) : (
                <ResultsTable columns={columns} rows={sortedRows} sort={activeSort} onSortChange={setSort} />
              )}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Visualization</Label>
          <ButtonGroup className="w-full">
            {VIZ_OPTIONS.map(option => {
              const Icon = option.icon;
              const active = vizType === option.value;
              return (
                <Button
                  key={option.value}
                  type="button"
                  variant={active ? "default" : "outline"}
                  aria-pressed={active}
                  className="flex-1"
                  onClick={() => setVizType(option.value)}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </Button>
              );
            })}
          </ButtonGroup>
        </div>

        {isChart && (
          <div className="space-y-3 rounded-lg border border-neutral-150 p-3 dark:border-neutral-850">
            <p className="text-xs text-neutral-500">
              {columns.length === 0
                ? "Run the query above to map result columns to the chart."
                : "Map result columns to the chart axes."}
            </p>
            <div className="space-y-1.5">
              <Label>X axis</Label>
              <Select value={xColumn ?? NONE_VALUE} onValueChange={value => setXColumn(value === NONE_VALUE ? undefined : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map(column => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Y values</Label>
              <MultiSelect
                options={columns.map(column => ({ value: column, label: column }))}
                value={yColumns}
                onValueChange={setYColumns}
                placeholder="Select numeric columns"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Split by series (optional)</Label>
              <Select
                value={seriesColumn ?? NONE_VALUE}
                onValueChange={value => setSeriesColumn(value === NONE_VALUE ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None</SelectItem>
                  {columns.map(column => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Done</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
