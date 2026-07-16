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
import { Sheet, SheetClose, SheetContent, SheetTitle } from "../../../../components/ui/sheet";
import {
  AreaChart,
  BarChart3,
  BarChartHorizontal,
  Braces,
  CalendarDays,
  ChevronDown,
  Hash,
  Lightbulb,
  LineChart,
  Loader2,
  Map as MapIcon,
  PieChart,
  Table2,
  X,
} from "lucide-react";
import { cn } from "../../../../lib/utils";
import { JsonEditor } from "../../feature-flags/components/JsonEditor";
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

type EditorMode = "visual" | "json";

const VIZ_TYPES: DashboardVizType[] = ["table", "line", "area", "bar", "hbar", "pie", "stat", "map", "calendar"];

/**
 * Validate a raw card edited in the JSON view. `id` is always taken from the
 * card being edited: changing it in JSON would orphan the card on save (the
 * dashboard matches updates by id), so it isn't user-editable.
 */
function parseCardJson(text: string, id: string): { card: DashboardCard | null; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    return { card: null, error: error instanceof Error ? error.message : "Invalid JSON" };
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { card: null, error: "Card must be a JSON object." };
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.title !== "string") return { card: null, error: "'title' must be a string." };
  if (typeof obj.sql !== "string") return { card: null, error: "'sql' must be a string." };
  if (!VIZ_TYPES.includes(obj.vizType as DashboardVizType)) {
    return { card: null, error: `'vizType' must be one of: ${VIZ_TYPES.join(", ")}.` };
  }
  if (typeof obj.mapping !== "object" || obj.mapping === null || Array.isArray(obj.mapping)) {
    return { card: null, error: "'mapping' must be an object." };
  }
  if (typeof obj.gridPos !== "object" || obj.gridPos === null || Array.isArray(obj.gridPos)) {
    return { card: null, error: "'gridPos' must be an object." };
  }
  const grid = obj.gridPos as Record<string, unknown>;
  for (const key of ["x", "y", "w", "h"] as const) {
    if (typeof grid[key] !== "number" || !Number.isFinite(grid[key])) {
      return { card: null, error: `'gridPos.${key}' must be a number.` };
    }
  }
  return {
    card: {
      id,
      title: obj.title,
      sql: obj.sql,
      vizType: obj.vizType as DashboardVizType,
      mapping: obj.mapping as DashboardCardMapping,
      gridPos: { x: grid.x as number, y: grid.y as number, w: grid.w as number, h: grid.h as number },
    },
    error: "",
  };
}

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
  const [gridPos, setGridPos] = useState(card.gridPos);
  // Seed from the card's SQL so opening the editor runs the query immediately
  // (the editor remounts on each open, so this re-seeds every time). Blank cards
  // have empty SQL, which leaves the query disabled until the user writes one.
  const [previewSql, setPreviewSql] = useState(card.sql);

  const [mode, setMode] = useState<EditorMode>("visual");
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

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

  // The card as the current edits describe it. id stays fixed; gridPos passes
  // through so the JSON view is the complete object.
  const buildCard = (): DashboardCard => ({
    id: card.id,
    title: title.trim() || card.title,
    sql,
    vizType,
    mapping: kind === "none" ? {} : mapping,
    gridPos,
  });

  // Push a full card (parsed from JSON) back into the field-level state the
  // visual editor drives, then re-run so the preview reflects it.
  const applyCard = (next: DashboardCard) => {
    setTitle(next.title);
    setSql(next.sql);
    setVizType(next.vizType);
    setXColumn(next.mapping.xColumn);
    setYColumns(next.mapping.yColumns ?? []);
    setSeriesColumn(next.mapping.seriesColumn);
    setValueColumn(next.mapping.valueColumn);
    setValueFormat(next.mapping.valueFormat ?? "number");
    setCountryColumn(next.mapping.countryColumn);
    setDateColumn(next.mapping.dateColumn);
    setGridPos(next.gridPos);
    setPreviewSql(next.sql);
  };

  const switchMode = (next: EditorMode) => {
    if (next === mode) return;
    if (next === "json") {
      setJsonText(JSON.stringify(buildCard(), null, 2));
      setJsonError(null);
      setMode("json");
      return;
    }
    // Returning to the visual editor requires valid JSON to apply; otherwise
    // stay put and surface the error.
    const result = parseCardJson(jsonText, card.id);
    if (!result.card) {
      setJsonError(result.error);
      return;
    }
    applyCard(result.card);
    setJsonError(null);
    setMode("visual");
  };

  const handleSave = () => {
    if (mode === "json") {
      const result = parseCardJson(jsonText, card.id);
      if (!result.card) {
        setJsonError(result.error);
        return;
      }
      onSave(result.card);
      onClose();
      return;
    }
    onSave(buildCard());
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

  // Examples picker, folded into the query editor's own toolbar so the editor
  // owns its chrome instead of duplicating a "Query" label above it.
  const examplesMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
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
  );

  const mappingControls = (
    <>
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
    </>
  );

  return (
    <Sheet open={open} onOpenChange={value => !value && onClose()}>
      <SheetContent
        side="right"
        showClose={false}
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl lg:max-w-6xl"
      >
        {/* Header: the card title is the heading, edited in place. */}
        <div className="flex shrink-0 items-center gap-2 border-b border-neutral-150 px-4 py-2.5 dark:border-neutral-850">
          <SheetTitle className="sr-only">Edit card</SheetTitle>
          <input
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="Untitled card"
            aria-label="Card title"
            disabled={mode === "json"}
            className="min-w-0 flex-1 rounded-md bg-transparent px-2 py-1 text-base font-semibold text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 hover:bg-neutral-100 focus:bg-neutral-100 focus-visible:ring-1 focus-visible:ring-neutral-300 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent dark:text-neutral-50 dark:placeholder:text-neutral-600 dark:hover:bg-neutral-900 dark:focus:bg-neutral-900 dark:focus-visible:ring-neutral-700"
          />
          {/* Mode toggle: visual builder vs. the full card object as JSON. */}
          <div className="flex shrink-0 items-center rounded-lg border border-neutral-150 p-0.5 dark:border-neutral-850">
            {(["visual", "json"] as const).map(value => (
              <button
                key={value}
                type="button"
                onClick={() => switchMode(value)}
                aria-pressed={mode === value}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  mode === value
                    ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                    : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
                )}
              >
                {value === "json" && <Braces className="h-3.5 w-3.5" />}
                {value === "visual" ? "Visual" : "JSON"}
              </button>
            ))}
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="smIcon" aria-label="Close editor" className="shrink-0 text-neutral-500">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>

        {mode === "json" ? (
          /* Raw card object: the full escape hatch, including gridPos. */
          <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
            <div className="flex shrink-0 items-center justify-between gap-2">
              <span className="text-xs font-medium text-neutral-500">Card JSON</span>
              <span className="text-[11px] text-neutral-500">
                Edit any field. <code className="font-mono text-neutral-600 dark:text-neutral-400">id</code> stays
                fixed.
              </span>
            </div>
            <div className="min-h-0 flex-1">
              <JsonEditor
                value={jsonText}
                onChange={next => {
                  setJsonText(next);
                  setJsonError(parseCardJson(next, card.id).error || null);
                }}
                ariaLabel="Card JSON"
                height="100%"
              />
            </div>
            {jsonError ? (
              <p className="shrink-0 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
                {jsonError}
              </p>
            ) : (
              <p className="shrink-0 text-[11px] text-neutral-500">Valid. Switch to Visual or save to apply.</p>
            )}
          </div>
        ) : (
          /* Workbench: data on the left, the visualization it produces on the right. */
          <div className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-neutral-150 overflow-y-auto lg:grid-cols-2 lg:divide-x lg:divide-y-0 lg:overflow-hidden dark:divide-neutral-850">
            {/* Left — query + results */}
            <div className="flex min-h-0 flex-col gap-3 p-4 lg:overflow-hidden">
              <QueryEditor
                value={sql}
                disabled={false}
                isRunning={isFetching}
                onChange={setSql}
                onFormat={() => setSql(formatQuery(sql))}
                onRun={() => setPreviewSql(sql)}
                headerActions={examplesMenu}
              />
              <p className="shrink-0 text-[11px] leading-relaxed text-neutral-500">
                Queries read from{" "}
                <code className="font-mono text-neutral-600 dark:text-neutral-400">scoped_events</code>, scoped to the
                dashboard time range. Use{" "}
                <code className="font-mono text-neutral-600 dark:text-neutral-400">{"{{bucket}}"}</code> for the
                selected granularity.
              </p>
              {error && (
                <p className="shrink-0 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
                  {error instanceof Error ? error.message : "Query failed"}
                </p>
              )}

              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-medium text-neutral-500">Results</span>
                  {previewSql && !error && isFetching && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" />
                  )}
                  {previewSql && !error && !isFetching && (
                    <span className="text-[11px] text-neutral-500">
                      {data?.meta.rowCount ?? 0} {data?.meta.rowCount === 1 ? "row" : "rows"}
                    </span>
                  )}
                  {truncated && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                      capped at {data?.meta.maxRows}
                    </span>
                  )}
                </div>
                <div className="flex h-72 flex-col overflow-hidden rounded-lg border border-neutral-150 lg:h-auto lg:min-h-0 lg:flex-1 dark:border-neutral-850">
                  {!previewSql ? (
                    <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
                      <span className="text-xs text-neutral-500">Run the query to see results</span>
                    </div>
                  ) : error ? (
                    <div className="flex h-full items-center justify-center px-6 text-center text-xs text-neutral-500">
                      Fix the query above to see results.
                    </div>
                  ) : isFetching && rows.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                    </div>
                  ) : rows.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-xs text-neutral-500">
                      No rows returned
                    </div>
                  ) : (
                    <ResultsTable columns={columns} rows={sortedRows} sort={activeSort} onSortChange={setSort} />
                  )}
                </div>
              </div>
            </div>

            {/* Right — chart type, live preview, column mapping */}
            <div className="flex min-h-0 flex-col gap-4 p-4 lg:overflow-y-auto">
              <div className="flex flex-col gap-1.5">
                <Label>Chart type</Label>
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
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-neutral-500">Preview</span>
                <div className="h-72 overflow-hidden rounded-lg border border-neutral-150 p-1 dark:border-neutral-850">
                  {vizType === "table" ? (
                    <div className="flex h-full items-center justify-center px-6 text-center text-xs text-neutral-500">
                      Table cards render the results from the left.
                    </div>
                  ) : rows.length === 0 ? (
                    <div className="flex h-full items-center justify-center px-6 text-center text-xs text-neutral-500">
                      {previewSql ? "No rows to visualize." : "Run the query to preview the chart."}
                    </div>
                  ) : (
                    <div key={vizType} className="h-full animate-in fade-in-0 duration-200 motion-reduce:animate-none">
                      {chartPreview}
                    </div>
                  )}
                </div>
              </div>

              {kind === "none" ? (
                <p className="text-xs text-neutral-500">
                  Table cards show every result column. Pick another chart type to map columns.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-medium text-neutral-500">
                    {columns.length === 0 ? "Map columns (run the query first)" : "Map columns"}
                  </span>
                  {mappingControls}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer: actions pinned so they stay reachable regardless of scroll. */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-neutral-150 px-4 py-3 dark:border-neutral-850">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={mode === "json" && !!jsonError}>
            Save card
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
