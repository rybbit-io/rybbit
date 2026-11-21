import type { Filter, FilterParameter } from "@rybbit/shared";

import type { PageRow, PagesMode, PageTrend } from "@/api/analytics/hooks/useGetPages";

/** Unique among the rows of one table: a page and a section can share a key ("/docs"). */
export const getRowId = (row: Pick<PageRow | PageTrend, "kind" | "key">) => `${row.kind}:${row.key}`;

/** How a section is written: "/docs/". The root section is just "/". */
export const formatSection = (section: string) => (section.endsWith("/") ? section : `${section}/`);

const MODE_PARAMETER: Record<PagesMode, FilterParameter> = {
  all: "pathname",
  entry: "entry_page",
  exit: "exit_page",
};

/**
 * The filter that identifies a page row. On the entry and exit lists a row
 * stands for the sessions that started or ended on the page, not every session
 * that saw it.
 */
export function getPageFilters(path: string, mode: PagesMode): Filter[] {
  return [{ parameter: MODE_PARAMETER[mode], value: [path], type: "equals" }];
}

/** Paths and sections of a batch of rows, as the trends endpoint takes them. */
export function getTrendKeys(rows: Pick<PageRow, "kind" | "key">[]) {
  return {
    paths: rows.filter(row => row.kind === "page").map(row => row.key),
    sections: rows.filter(row => row.kind === "section").map(row => row.key),
  };
}
