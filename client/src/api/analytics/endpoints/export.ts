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
