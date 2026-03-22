import { authedFetch } from "../../utils";

export interface TableStats {
  table: string;
  totalRows: number;
  compressedSize: string;
  compressedBytes: number;
  uncompressedSize: string;
  uncompressedBytes: number;
  partsCount: number;
}

export interface RowsByDate {
  date: string;
  table: string;
  rowsInserted: number;
}

export interface InsertRate {
  hour: string;
  insertCount: number;
  totalRowsInserted: number;
}

export interface QueryError {
  eventTime: string;
  queryId: string;
  exceptionCode: number;
  exception: string;
  query: string;
}

export interface ClickhouseStatsResponse {
  tableStats: TableStats[];
  rowsByDate: RowsByDate[];
  insertRate: InsertRate[];
  queryErrors: QueryError[];
  unavailableFeatures: string[];
}

export interface QueryLogEntry {
  eventTime: string;
  queryId: string;
  queryKind: string;
  queryDurationMs: number;
  readRows: number;
  readBytes: number;
  writtenRows: number;
  writtenBytes: number;
  memoryUsage: number;
  type: string;
  exceptionCode: number;
  query: string;
  user: string;
  databases: string[];
  tables: string[];
}

export interface ClickhouseQueryLogResponse {
  items: QueryLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  unavailable?: boolean;
}

export interface QueryLogParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  queryKind?: string;
  type?: string;
}

export function getClickhouseStats(days?: number) {
  const params = days !== undefined ? `?days=${days}` : "";
  return authedFetch<ClickhouseStatsResponse>(`/admin/clickhouse-stats${params}`);
}

export function getClickhouseQueryLog(params: QueryLogParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);
  if (params.queryKind) searchParams.set("queryKind", params.queryKind);
  if (params.type) searchParams.set("type", params.type);
  const qs = searchParams.toString();
  return authedFetch<ClickhouseQueryLogResponse>(
    `/admin/clickhouse-query-log${qs ? `?${qs}` : ""}`
  );
}
