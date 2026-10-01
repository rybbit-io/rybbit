import { TraitKey } from "@/api/analytics/endpoints";

/** The table's own columns, in display order. The user column is always shown and comes first. */
export const BUILT_IN_COLUMNS = [
  "last_seen",
  "first_seen",
  "sessions",
  "pageviews",
  "events",
  "source",
  "location",
  "device",
] as const;

export type BuiltInColumn = (typeof BUILT_IN_COLUMNS)[number];

/** A built-in column, or a trait shown as a column. Trait columns sit between the user and the built-ins. */
export type TableColumn = { kind: "trait"; key: string } | { kind: "builtIn"; id: BuiltInColumn };

export interface ColumnSelection {
  builtIn: BuiltInColumn[];
  traits: string[];
}

export const DEFAULT_BUILT_IN: BuiltInColumn[] = [
  "last_seen",
  "sessions",
  "pageviews",
  "events",
  "source",
  "location",
  "device",
];

/** Per-user counts: the columns a trait group averages. */
export const METRIC_COLUMNS: readonly BuiltInColumn[] = ["sessions", "pageviews", "events"];

/** The columns the server can sort by. */
export const SORTABLE_COLUMNS: readonly BuiltInColumn[] = [
  "last_seen",
  "first_seen",
  "sessions",
  "pageviews",
  "events",
];

// Sized so the default columns and two traits fit the page at its usual desktop width without scrolling.
export const USER_COLUMN_MIN_WIDTH = 224;
const TRAIT_COLUMN_WIDTH = 104;
const COLUMN_WIDTHS: Record<BuiltInColumn, number> = {
  // Wide enough for the absolute date the cell shows on hover.
  last_seen: 128,
  first_seen: 128,
  sessions: 76,
  pageviews: 84,
  events: 68,
  source: 140,
  location: 124,
  device: 84,
};

export const columnWidth = (column: TableColumn) =>
  column.kind === "trait" ? TRAIT_COLUMN_WIDTH : COLUMN_WIDTHS[column.id];

export const columnId = (column: TableColumn) => (column.kind === "trait" ? `trait:${column.key}` : column.id);

/** The visible columns after the user column, in display order. */
export function visibleColumns(selection: ColumnSelection): TableColumn[] {
  return [
    ...selection.traits.map(key => ({ kind: "trait" as const, key })),
    ...BUILT_IN_COLUMNS.filter(id => selection.builtIn.includes(id)).map(id => ({ kind: "builtIn" as const, id })),
  ];
}

/** The narrowest the table can be before it scrolls sideways. */
export const tableMinWidth = (columns: TableColumn[]) =>
  columns.reduce((total, column) => total + columnWidth(column), USER_COLUMN_MIN_WIDTH);

// Already on every row: the name and the line under it.
const IDENTITY_TRAITS = new Set(["username", "name", "email"]);
const DEFAULT_TRAIT_COLUMNS = 2;

/**
 * Trait columns shown before the viewer has chosen any: the site's most common
 * traits, which is the order the keys arrive in.
 */
export function defaultTraitColumns(keys: TraitKey[]): string[] {
  return keys
    .map(item => item.key)
    .filter(key => !IDENTITY_TRAITS.has(key.toLowerCase()))
    .slice(0, DEFAULT_TRAIT_COLUMNS);
}

export function toggleBuiltIn(selection: ColumnSelection, id: BuiltInColumn): ColumnSelection {
  const builtIn = selection.builtIn.includes(id)
    ? selection.builtIn.filter(candidate => candidate !== id)
    : [...selection.builtIn, id];
  return { ...selection, builtIn };
}

export function toggleTrait(selection: ColumnSelection, key: string): ColumnSelection {
  const traits = selection.traits.includes(key)
    ? selection.traits.filter(candidate => candidate !== key)
    : [...selection.traits, key];
  return { ...selection, traits };
}

const isBuiltIn = (value: unknown): value is BuiltInColumn =>
  typeof value === "string" && (BUILT_IN_COLUMNS as readonly string[]).includes(value);

/** A stored selection, or null when it is missing or not in the shape this version writes. */
export function parseColumnSelection(raw: string | null): ColumnSelection | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { builtIn, traits } = parsed as { builtIn?: unknown; traits?: unknown };
    if (!Array.isArray(builtIn) || !Array.isArray(traits)) return null;
    return {
      builtIn: builtIn.filter(isBuiltIn),
      traits: traits.filter((key): key is string => typeof key === "string"),
    };
  } catch {
    return null;
  }
}

/** How a trait value reads in a cell. Null when there is nothing to show. */
export function formatTraitValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}
