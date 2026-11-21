import { format as formatSql } from "sql-formatter";
import type { CustomQueryRow } from "../../../api/analytics/endpoints";
import type { QueryTab, SortState } from "./types";

const DEFAULT_QUERY = "";

export function createQueryTab(index: number): QueryTab {
  return {
    id: `${Date.now()}-${index}`,
    name: `Query ${index}`,
    prompt: "",
    query: DEFAULT_QUERY,
    generationHistory: [],
    rows: [],
    sort: null,
    resultError: null,
    hasRun: false,
  };
}

export function formatCellValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function getColumns(rows: CustomQueryRow[]) {
  const columns = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      columns.add(key);
    }
  }
  return Array.from(columns);
}

function compareCellValues(left: unknown, right: unknown) {
  const leftIsEmpty = left === null || left === undefined || left === "";
  const rightIsEmpty = right === null || right === undefined || right === "";

  if (leftIsEmpty && rightIsEmpty) return 0;
  if (leftIsEmpty) return 1;
  if (rightIsEmpty) return -1;

  if (typeof left === "boolean" && typeof right === "boolean") {
    return Number(left) - Number(right);
  }

  const leftNumber = typeof left === "number" ? left : typeof left === "string" ? Number(left) : Number.NaN;
  const rightNumber = typeof right === "number" ? right : typeof right === "string" ? Number(right) : Number.NaN;

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }

  return formatCellValue(left).localeCompare(formatCellValue(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function sortRows(rows: CustomQueryRow[], sort: SortState) {
  if (!sort) return rows;

  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const comparison = compareCellValues(left.row[sort.column], right.row[sort.column]);
      if (comparison === 0) return left.index - right.index;
      return sort.direction === "asc" ? comparison : -comparison;
    })
    .map(item => item.row);
}

export function getNextSortState(currentSort: SortState, column: string): SortState {
  if (!currentSort || currentSort.column !== column) {
    return { column, direction: "asc" };
  }

  if (currentSort.direction === "asc") {
    return { column, direction: "desc" };
  }

  return null;
}

export function isAbortError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const codedError = error as Error & { code?: string };
  return error.name === "AbortError" || error.name === "CanceledError" || codedError.code === "ERR_CANCELED";
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function formatQuery(query: string) {
  try {
    return formatSql(query, {
      language: "sql",
      keywordCase: "upper",
      linesBetweenQueries: 1,
    });
  } catch {
    return query;
  }
}
