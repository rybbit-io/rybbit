import { Filter, FilterParameter } from "@rybbit/shared";
import { buildAnalyticsRequest, fetchAnalytics } from "../../../../../api/analytics/analyticsRequest";
import { fetchGSCConnectionStatus, fetchGSCData, GSCDimension } from "../../../../../api/gsc/endpoints";
import { getGSCDateRange } from "../../../../../api/gsc/gscDateRange";
import { Time } from "../../../../../components/DateSelector/types";
import { CSVFile, downloadZip, formatDateForFilename } from "../../../../../lib/export";

// One row per exported file: the analytics read that produces it.
const METRIC_FILES: { param: FilterParameter; filename: string }[] = [
  // Referrers
  { param: "referrer", filename: "referrers.csv" },
  { param: "channel", filename: "channels.csv" },
  { param: "utm_source", filename: "utm-source.csv" },
  { param: "utm_medium", filename: "utm-medium.csv" },
  { param: "utm_campaign", filename: "utm-campaign.csv" },
  { param: "utm_term", filename: "utm-term.csv" },
  { param: "utm_content", filename: "utm-content.csv" },
  // Pages
  { param: "pathname", filename: "pages.csv" },
  { param: "page_title", filename: "page-titles.csv" },
  { param: "entry_page", filename: "entry-pages.csv" },
  { param: "exit_page", filename: "exit-pages.csv" },
  { param: "hostname", filename: "hostnames.csv" },
  // Devices
  { param: "browser", filename: "browsers.csv" },
  { param: "device_type", filename: "devices.csv" },
  { param: "device_model", filename: "device-models.csv" },
  { param: "app_version", filename: "app-versions.csv" },
  { param: "operating_system", filename: "operating-systems.csv" },
  { param: "dimensions", filename: "screen-dimensions.csv" },
  // Locations
  { param: "country", filename: "countries.csv" },
  { param: "region", filename: "regions.csv" },
  { param: "city", filename: "cities.csv" },
  { param: "language", filename: "languages.csv" },
  { param: "timezone", filename: "timezones.csv" },
];

type ExportDescriptor = {
  filename: string;
  path: string;
  params?: Record<string, unknown>;
  // Metric responses are `{ data, totalCount }`; the rest are plain rows.
  rows?: (payload: any) => Record<string, unknown>[];
};

const EXPORTS: ExportDescriptor[] = [
  ...METRIC_FILES.map(({ param, filename }) => ({
    filename,
    path: "metric",
    params: { parameter: param },
    rows: (payload: { data: Record<string, unknown>[] }) => payload.data,
  })),
  { filename: "overview-timeseries.csv", path: "overview/time-series", params: { bucket: "day" } },
  { filename: "weekdays-heatmap.csv", path: "overview/time-series", params: { bucket: "hour" } },
  { filename: "events.csv", path: "events/names" },
  { filename: "outbound-links.csv", path: "events/outbound" },
];

const GSC_DIMENSIONS: { dimension: GSCDimension; filename: string }[] = [
  { dimension: "query", filename: "gsc-queries.csv" },
  { dimension: "page", filename: "gsc-pages.csv" },
  { dimension: "country", filename: "gsc-countries.csv" },
  { dimension: "device", filename: "gsc-devices.csv" },
];

interface ExportCsvParams {
  site: string;
  time: Time;
  filters: Filter[];
  timeZone: string;
}

export async function exportCsv({ site, time, filters, timeZone }: ExportCsvParams): Promise<number> {
  // Same request builder the dashboard uses, so the export covers every time
  // mode — including past-minutes and exact-datetime ranges.
  const context = { time, timeZone, filters };

  const analyticsFiles = EXPORTS.map(async ({ filename, path, params, rows }) => {
    try {
      const payload = await fetchAnalytics<unknown>(site, buildAnalyticsRequest({ path, params }, context));
      return { filename, data: rows ? rows(payload) : (payload as Record<string, unknown>[]) };
    } catch {
      console.warn(`Failed to fetch ${filename}`);
      return { filename, data: [] };
    }
  });

  const gscFiles = (async (): Promise<CSVFile[]> => {
    try {
      const status = await fetchGSCConnectionStatus(site);
      if (!status.connected) {
        return [];
      }

      // GSC only serves whole-day ranges, so the dashboard window is widened
      // the same way the GSC dashboard section widens it.
      const { startDate, endDate } = getGSCDateRange(time, timeZone);

      return await Promise.all(
        GSC_DIMENSIONS.map(async ({ dimension, filename }) => {
          try {
            const data = await fetchGSCData(site, { dimension, startDate, endDate, timeZone });
            return { filename, data: data as unknown as Record<string, unknown>[] };
          } catch {
            console.warn(`Failed to fetch GSC ${dimension}`);
            return { filename, data: [] };
          }
        })
      );
    } catch {
      console.warn("Failed to check GSC connection");
      return [];
    }
  })();

  const [analyticsResults, gscResults] = await Promise.all([Promise.all(analyticsFiles), gscFiles]);

  const csvFiles: CSVFile[] = [...analyticsResults, ...gscResults];
  const nonEmptyFiles = csvFiles.filter(f => f.data.length > 0);

  if (nonEmptyFiles.length === 0) {
    throw new Error("No data to export");
  }

  const zipFilename = `rybbit-export-${site}-${formatDateForFilename()}.zip`;
  await downloadZip(nonEmptyFiles, zipFilename);

  return nonEmptyFiles.length;
}
