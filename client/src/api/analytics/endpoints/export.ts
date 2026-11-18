import { BACKEND_URL } from "../../../lib/const";
import { authedFetch } from "../../utils";
import { CommonApiParams, toQueryParams } from "./types";

export interface ExportPdfParams extends CommonApiParams {}

/**
 * Export analytics data as a PDF report
 * GET /api/sites/:siteId/export/pdf
 *
 * This function fetches the PDF from the server and triggers a browser download.
 */
export async function exportPdfReport(site: string | number, params: ExportPdfParams): Promise<void> {
  const blob = await authedFetch<Blob>(`/sites/${site}/export/pdf`, toQueryParams(params), {
    responseType: "blob",
  });

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;

  // Generate filename with date range
  const startDate = params.startDate || "all";
  const endDate = params.endDate || "time";
  link.download = `rybbit-report-${site}-${startDate}-to-${endDate}.pdf`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export type EventExportFormat = "csv" | "ndjson";

/** An inclusive date range in `timeZone`; empty dates export all time. */
export interface EventExportParams {
  startDate: string;
  endDate: string;
  timeZone: string;
}

export interface EventExportCount {
  rows: number;
  maxRows: number;
}

const eventExportQuery = ({ startDate, endDate, timeZone }: EventExportParams): Record<string, string> =>
  startDate && endDate ? { start_date: startDate, end_date: endDate, time_zone: timeZone } : { time_zone: timeZone };

/**
 * How many events an export of this range would return, and the per-file cap.
 * GET /api/sites/:siteId/export/events/count
 */
export async function fetchEventExportCount(site: string | number, params: EventExportParams) {
  const response = await authedFetch<{ data: EventExportCount }>(
    `/sites/${site}/export/events/count`,
    eventExportQuery(params)
  );
  return response.data;
}

/**
 * The download URL for a raw event export. The browser fetches it directly so
 * the file streams to disk instead of being held in memory; the session cookie
 * authenticates it.
 * GET /api/sites/:siteId/export/events
 */
export function eventExportUrl(site: string | number, params: EventExportParams, format: EventExportFormat) {
  const query = new URLSearchParams({ ...eventExportQuery(params), format });
  return `${BACKEND_URL}/sites/${site}/export/events?${query}`;
}
