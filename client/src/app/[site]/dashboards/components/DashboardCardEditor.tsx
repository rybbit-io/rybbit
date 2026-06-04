"use client";

import type { DashboardCard, DashboardCardMapping, DashboardValueFormat, DashboardVizType } from "@rybbit/shared";
import { useMemo, useState } from "react";
import { useDashboardCard } from "../../../../api/analytics/hooks/useDashboardCard";
import { Button } from "../../../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../../../../components/ui/dropdown-menu";
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
import {
  AreaChart,
  BarChart3,
  BarChartHorizontal,
  CalendarDays,
  ChevronDown,
  Hash,
  Lightbulb,
  LineChart,
  Loader2,
  Map as MapIcon,
  PieChart,
  Table2,
} from "lucide-react";
import { QueryEditor } from "../../query/components/QueryEditor";
import { ResultsTable } from "../../query/components/ResultsTable";
import type { SortState } from "../../query/types";
import { formatQuery, getColumns, sortRows } from "../../query/utils";
import { DASHBOARD_EXAMPLES, DASHBOARD_EXAMPLE_CATEGORIES, type DashboardExample } from "../examples";
import { DashboardBarChart } from "./charts/DashboardBarChart";
import { DashboardBarList } from "./charts/DashboardBarList";
import { DashboardCalendar } from "./charts/DashboardCalendar";
import { DashboardLineChart } from "./charts/DashboardLineChart";
import { DashboardMap } from "./charts/DashboardMap";
import { DashboardPie } from "./charts/DashboardPie";
import { DashboardStat } from "./charts/DashboardStat";

type DashboardCardEditorProps = {
  siteId: number;
  card: DashboardCard;
  open: boolean;
  onClose: () => void;
  onSave: (card: DashboardCard) => void;
};

const NONE_VALUE = "__none__";

type VizOption = { value: DashboardVizType; label: string; icon: typeof LineChart };

// Grouped by what the viz is for, so the picker reads as families rather than a
// flat wall of nine equal tiles.
const VIZ_GROUPS: { label: string; options: VizOption[] }[] = [
  {
    label: "Trends over time",
    options: [
      { value: "line", label: "Line", icon: LineChart },
      { value: "area", label: "Area", icon: AreaChart },
    ],
  },
  {
    label: "Comparisons",
    options: [
      { value: "bar", label: "Bar", icon: BarChart3 },
      { value: "hbar", label: "Bar list", icon: BarChartHorizontal },
      { value: "pie", label: "Donut", icon: PieChart },
    ],
  },
  {
    label: "Single value & table",
    options: [
      { value: "stat", label: "Stat", icon: Hash },
      { value: "table", label: "Table", icon: Table2 },
    ],
  },
  {
    label: "Maps & calendars",
    options: [
      { value: "map", label: "Map", icon: MapIcon },
      { value: "calendar", label: "Calendar", icon: CalendarDays },
    ],
  },
];

const FORMAT_OPTIONS: { value: DashboardValueFormat; label: string }[] = [
  { value: "number", label: "Number" },
  { value: "percent", label: "Percent" },
  { value: "duration", label: "Duration" },
  { value: "bytes", label: "Bytes" },
];

/** Which mapping controls a given viz type needs. */
type MappingKind = "none" | "xy" | "categoryValue" | "stat" | "map" | "calendar";

function mappingKind(vizType: DashboardVizType): MappingKind {
  switch (vizType) {
    case "table":
      return "none";
    case "line":
    case "area":
    case "bar":
      return "xy";
    case "hbar":
    case "pie":
      return "categoryValue";
    case "stat":
      return "stat";
    case "map":
      return "map";
    case "calendar":
      return "calendar";
  }
}

/** Single-column dropdown shared across the mapping controls. */
function ColumnSelect({
  label,
  value,
  columns,
  onChange,
  includeNone,
  placeholder = "Select column",
}: {
  label: string;
  value: string | undefined;
  columns: string[];
  onChange: (value: string | undefined) => void;
  includeNone?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value ?? NONE_VALUE} onValueChange={next => onChange(next === NONE_VALUE ? undefined : next)}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {includeNone && <SelectItem value={NONE_VALUE}>None</SelectItem>}
          {columns.map(column => (
            <SelectItem key={column} value={column}>
              {column}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Value-format dropdown for stat / pie / bar-list / map / calendar cards. */
function FormatSelect({
  value,
  onChange,
}: {
  value: DashboardValueFormat;
  onChange: (value: DashboardValueFormat) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>Value format</Label>
      <Select value={value} onValueChange={next => onChange(next as DashboardValueFormat)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FORMAT_OPTIONS.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function DashboardCardEditor({ siteId, card, open, onClose, onSave }: DashboardCardEditorProps) {
  const [title, setTitle] = useState(card.title);
  const [sql, setSql] = useState(card.sql);
  const [vizType, setVizType] = useState<DashboardVizType>(card.vizType);
  const [xColumn, setXColumn] = useState(card.mapping.xColumn);
  const [yColumns, setYColumns] = useState<string[]>(card.mapping.yColumns ?? []);
  const [seriesColumn, setSeriesColumn] = useState(card.mapping.seriesColumn);
  const [valueColumn, setValueColumn] = useState(card.mapping.valueColumn);
  const [valueFormat, setValueFormat] = useState<DashboardValueFormat>(card.mapping.valueFormat ?? "number");
  const [countryColumn, setCountryColumn] = useState(card.mapping.countryColumn);
  const [dateColumn, setDateColumn] = useState(card.mapping.dateColumn);
  const [previewSql, setPreviewSql] = useState("");

  const [sort, setSort] = useState<SortState>(null);

  const { data, isFetching, error } = useDashboardCard(siteId, `${card.id}-preview`, previewSql, !!previewSql);
  const rows = data?.data ?? [];
  const columns = useMemo(() => getColumns(rows), [rows]);
  const activeSort = sort && columns.includes(sort.column) ? sort : null;
  const sortedRows = useMemo(() => sortRows(rows, activeSort), [rows, activeSort]);
  const truncated = data?.meta && data.meta.rowCount >= data.meta.maxRows;
  const kind = mappingKind(vizType);

  const mapping: DashboardCardMapping = useMemo(
    () => ({ xColumn, yColumns, seriesColumn, valueColumn, valueFormat, countryColumn, dateColumn }),
    [xColumn, yColumns, seriesColumn, valueColumn, valueFormat, countryColumn, dateColumn]
  );

  const applyExample = (example: DashboardExample) => {
    setSql(example.sql);
    setVizType(example.vizType);
    setXColumn(example.mapping.xColumn);
    setYColumns(example.mapping.yColumns ?? []);
    setSeriesColumn(example.mapping.seriesColumn);
    setValueColumn(example.mapping.valueColumn);
    setValueFormat(example.mapping.valueFormat ?? "number");
    setCountryColumn(example.mapping.countryColumn);
    setDateColumn(example.mapping.dateColumn);
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
      mapping: kind === "none" ? {} : mapping,
    });
    onClose();
  };

  const chartPreview =
    vizType === "line" ? (
      <DashboardLineChart rows={rows} mapping={mapping} />
    ) : vizType === "area" ? (
      <DashboardLineChart rows={rows} mapping={mapping} area />
    ) : vizType === "bar" ? (
      <DashboardBarChart rows={rows} mapping={mapping} />
    ) : vizType === "hbar" ? (
      <DashboardBarList rows={rows} mapping={mapping} />
    ) : vizType === "pie" ? (
      <DashboardPie rows={rows} mapping={mapping} />
    ) : vizType === "stat" ? (
      <DashboardStat rows={rows} mapping={mapping} />
    ) : vizType === "map" ? (
      <DashboardMap rows={rows} mapping={mapping} />
    ) : vizType === "calendar" ? (
      <DashboardCalendar rows={rows} mapping={mapping} />
    ) : null;

  return (
    <Sheet open={open} onOpenChange={value => !value && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-5 overflow-y-auto sm:max-w-4xl lg:max-w-6xl">
        <SheetHeader>
          <SheetTitle>Edit card</SheetTitle>
        </SheetHeader>

        <div className="space-y-1.5">
          <Label htmlFor="card-title">Title</Label>
          <Input id="card-title" value={title} onChange={event => setTitle(event.target.value)} />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label>Query</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="-mr-1 h-6 gap-1 px-1.5 text-xs font-normal text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  Examples
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {DASHBOARD_EXAMPLE_CATEGORIES.map(category => (
                  <DropdownMenuSub key={category}>
                    <DropdownMenuSubTrigger className="text-sm">{category}</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="max-h-[60vh] w-72 overflow-y-auto">
                      {DASHBOARD_EXAMPLES.filter(example => example.category === category).map(example => (
                        <DropdownMenuItem
                          key={example.id}
                          className="flex flex-col items-start gap-0.5"
                          onSelect={() => applyExample(example)}
                        >
                          <span className="flex items-center gap-1.5">
                            {example.title}
                            {example.beyondPrebuilt && (
                              <span className="rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                advanced
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] text-neutral-500">{example.description}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Results</Label>
            {previewSql && !error && isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" />}
            {previewSql && !error && !isFetching && (
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
          <div className="flex h-64 flex-col overflow-hidden rounded-lg border border-neutral-150 dark:border-neutral-850">
            {!previewSql || error ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-xs text-neutral-500">
                {error ? "Fix the query above to see results." : "Run the query to see results."}
              </div>
            ) : isFetching && rows.length === 0 ? (
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

        <div className="space-y-2">
          <Label>Visualization</Label>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="h-72 overflow-hidden rounded-lg border border-neutral-150 p-1 dark:border-neutral-850">
              {vizType === "table" ? (
                <div className="flex h-full items-center justify-center px-6 text-center text-xs text-neutral-500">
                  Table cards display the results shown above.
                </div>
              ) : rows.length === 0 ? (
                <div className="flex h-full items-center justify-center px-6 text-center text-xs text-neutral-500">
                  {previewSql ? "No rows to visualize." : "Run the query to preview the chart."}
                </div>
              ) : (
                chartPreview
              )}
            </div>

            <div className="space-y-3">
              <Select value={vizType} onValueChange={next => setVizType(next as DashboardVizType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIZ_GROUPS.map(group => (
                    <SelectGroup key={group.label}>
                      <SelectLabel>{group.label}</SelectLabel>
                      {group.options.map(option => {
                        const Icon = option.icon;
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <span className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {option.label}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>

              {kind === "none" ? (
                <p className="text-xs text-neutral-500">
                  Table cards need no column mapping. Pick another visualization to map result columns.
                </p>
              ) : (
                <div className="space-y-3 rounded-lg border border-neutral-150 p-3 dark:border-neutral-850">
                  <p className="text-xs text-neutral-500">
                    {columns.length === 0
                      ? "Run the query to map result columns to the visualization."
                      : "Map result columns to the visualization."}
                  </p>

                  {kind === "xy" && (
                    <>
                      <ColumnSelect label="X axis" value={xColumn} columns={columns} onChange={setXColumn} />
                      <div className="space-y-1.5">
                        <Label>Y values</Label>
                        <MultiSelect
                          options={columns.map(column => ({ value: column, label: column }))}
                          value={yColumns}
                          onValueChange={setYColumns}
                          placeholder="Select numeric columns"
                        />
                      </div>
                      <ColumnSelect
                        label="Split by series (optional)"
                        value={seriesColumn}
                        columns={columns}
                        onChange={setSeriesColumn}
                        includeNone
                        placeholder="None"
                      />
                    </>
                  )}

                  {kind === "categoryValue" && (
                    <>
                      <ColumnSelect
                        label={vizType === "pie" ? "Slice label" : "Category"}
                        value={xColumn}
                        columns={columns}
                        onChange={setXColumn}
                      />
                      <ColumnSelect
                        label="Value"
                        value={valueColumn}
                        columns={columns}
                        onChange={setValueColumn}
                        includeNone
                        placeholder="Auto (first numeric)"
                      />
                      <FormatSelect value={valueFormat} onChange={setValueFormat} />
                    </>
                  )}

                  {kind === "stat" && (
                    <>
                      <ColumnSelect
                        label="Value"
                        value={valueColumn}
                        columns={columns}
                        onChange={setValueColumn}
                        includeNone
                        placeholder="Auto (first numeric)"
                      />
                      <ColumnSelect
                        label="Label (optional)"
                        value={xColumn}
                        columns={columns}
                        onChange={setXColumn}
                        includeNone
                        placeholder="None"
                      />
                      <FormatSelect value={valueFormat} onChange={setValueFormat} />
                    </>
                  )}

                  {kind === "map" && (
                    <>
                      <ColumnSelect
                        label="Country column (ISO-2 codes)"
                        value={countryColumn}
                        columns={columns}
                        onChange={setCountryColumn}
                      />
                      <ColumnSelect
                        label="Value"
                        value={valueColumn}
                        columns={columns}
                        onChange={setValueColumn}
                        includeNone
                        placeholder="Auto (first numeric)"
                      />
                      <FormatSelect value={valueFormat} onChange={setValueFormat} />
                    </>
                  )}

                  {kind === "calendar" && (
                    <>
                      <ColumnSelect label="Date column" value={dateColumn} columns={columns} onChange={setDateColumn} />
                      <ColumnSelect
                        label="Value"
                        value={valueColumn}
                        columns={columns}
                        onChange={setValueColumn}
                        includeNone
                        placeholder="Auto (first numeric)"
                      />
                      <FormatSelect value={valueFormat} onChange={setValueFormat} />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

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
