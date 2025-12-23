"use client";

import { FilterParameter } from "@rybbit/shared";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  fetchEventNames,
  fetchMetric,
  fetchOutboundLinks,
  fetchOverviewBucketed,
} from "../../../../api/analytics/endpoints";
import { getStartAndEndDate } from "../../../../api/utils";
import { fetchGSCConnectionStatus } from "../../../../api/gsc/useGSCConnection";
import { fetchGSCData, GSCDimension } from "../../../../api/gsc/useGSCData";
import { Button } from "../../../../components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../components/ui/tooltip";
import { IS_CLOUD } from "../../../../lib/const";
import { CSVFile, downloadZip, formatDateForFilename } from "../../../../lib/export";
import { useStore } from "../../../../lib/store";
import { timeZone } from "../../../../lib/dateTimeUtils";

// Metric parameters for each section
const REFERRER_METRICS: { param: FilterParameter; filename: string }[] = [
  { param: "referrer", filename: "referrers.csv" },
  { param: "channel", filename: "channels.csv" },
  { param: "utm_source", filename: "utm-source.csv" },
  { param: "utm_medium", filename: "utm-medium.csv" },
  { param: "utm_campaign", filename: "utm-campaign.csv" },
  { param: "utm_term", filename: "utm-term.csv" },
  { param: "utm_content", filename: "utm-content.csv" },
];

const PAGE_METRICS: { param: FilterParameter; filename: string }[] = [
  { param: "pathname", filename: "pages.csv" },
  { param: "page_title", filename: "page-titles.csv" },
  { param: "entry_page", filename: "entry-pages.csv" },
  { param: "exit_page", filename: "exit-pages.csv" },
  { param: "hostname", filename: "hostnames.csv" },
];

const DEVICE_METRICS: { param: FilterParameter; filename: string }[] = [
  { param: "browser", filename: "browsers.csv" },
  { param: "device_type", filename: "devices.csv" },
  { param: "operating_system", filename: "operating-systems.csv" },
  { param: "dimensions", filename: "screen-dimensions.csv" },
];

const COUNTRY_METRICS: { param: FilterParameter; filename: string }[] = [
  { param: "country", filename: "countries.csv" },
  { param: "region", filename: "regions.csv" },
  { param: "city", filename: "cities.csv" },
  { param: "language", filename: "languages.csv" },
  { param: "timezone", filename: "timezones.csv" },
];

const NETWORK_METRICS: { param: FilterParameter; filename: string }[] = [
  { param: "vpn", filename: "vpn.csv" },
  { param: "crawler", filename: "crawlers.csv" },
  { param: "datacenter", filename: "datacenters.csv" },
  { param: "company", filename: "companies.csv" },
  { param: "company_type", filename: "company-types.csv" },
  { param: "company_domain", filename: "company-domains.csv" },
  { param: "asn_org", filename: "asn-orgs.csv" },
  { param: "asn_type", filename: "asn-types.csv" },
  { param: "asn_domain", filename: "asn-domains.csv" },
];

const GSC_DIMENSIONS: { dimension: GSCDimension; filename: string }[] = [
  { dimension: "query", filename: "gsc-queries.csv" },
  { dimension: "page", filename: "gsc-pages.csv" },
  { dimension: "country", filename: "gsc-countries.csv" },
  { dimension: "device", filename: "gsc-devices.csv" },
];

export function ExportButton() {
  const [isExporting, setIsExporting] = useState(false);
  const { site, time, filters } = useStore();

  const handleExport = async () => {
    if (!site) {
      toast.error("No site selected");
      return;
    }

    setIsExporting(true);
    const csvFiles: CSVFile[] = [];

    // Convert time to API params
    const { startDate, endDate } = getStartAndEndDate(time);
    const commonParams = {
      startDate: startDate ?? "",
      endDate: endDate ?? "",
      timeZone,
      filters,
    };

    try {
      // Fetch all metrics in parallel
      const allMetrics = [
        ...REFERRER_METRICS,
        ...PAGE_METRICS,
        ...DEVICE_METRICS,
        ...COUNTRY_METRICS,
        ...(IS_CLOUD ? NETWORK_METRICS : []),
      ];

      const metricPromises = allMetrics.map(async ({ param, filename }) => {
        try {
          const result = await fetchMetric(site, { ...commonParams, parameter: param });
          return { filename, data: result.data as Record<string, unknown>[] };
        } catch {
          console.warn(`Failed to fetch ${param}`);
          return { filename, data: [] };
        }
      });

      // Fetch overview bucketed data
      const overviewPromise = (async () => {
        try {
          const data = await fetchOverviewBucketed(site, { ...commonParams, bucket: "day" });
          return {
            filename: "overview-timeseries.csv",
            data: data as unknown as Record<string, unknown>[],
          };
        } catch {
          console.warn("Failed to fetch overview bucketed");
          return { filename: "overview-timeseries.csv", data: [] };
        }
      })();

      // Fetch weekdays heatmap data (hourly bucketed)
      const weekdaysPromise = (async () => {
        try {
          const data = await fetchOverviewBucketed(site, { ...commonParams, bucket: "hour" });
          return {
            filename: "weekdays-heatmap.csv",
            data: data as unknown as Record<string, unknown>[],
          };
        } catch {
          console.warn("Failed to fetch weekdays data");
          return { filename: "weekdays-heatmap.csv", data: [] };
        }
      })();

      // Fetch events data
      const eventsPromise = (async () => {
        try {
          const data = await fetchEventNames(site, commonParams);
          return {
            filename: "events.csv",
            data: data as unknown as Record<string, unknown>[],
          };
        } catch {
          console.warn("Failed to fetch events");
          return { filename: "events.csv", data: [] };
        }
      })();

      // Fetch outbound links
      const outboundPromise = (async () => {
        try {
          const data = await fetchOutboundLinks(site, commonParams);
          return {
            filename: "outbound-links.csv",
            data: data as unknown as Record<string, unknown>[],
          };
        } catch {
          console.warn("Failed to fetch outbound links");
          return { filename: "outbound-links.csv", data: [] };
        }
      })();

      // Check GSC connection and fetch if connected
      const gscPromises = (async () => {
        try {
          const status = await fetchGSCConnectionStatus(site);
          if (!status.connected) {
            return [];
          }

          const gscResults = await Promise.all(
            GSC_DIMENSIONS.map(async ({ dimension, filename }) => {
              try {
                const data = await fetchGSCData(site, dimension, time);
                return {
                  filename,
                  data: data as unknown as Record<string, unknown>[],
                };
              } catch {
                console.warn(`Failed to fetch GSC ${dimension}`);
                return { filename, data: [] };
              }
            })
          );
          return gscResults;
        } catch {
          console.warn("Failed to check GSC connection");
          return [];
        }
      })();

      // Wait for all fetches to complete
      const [metricResults, overview, weekdays, events, outbound, gscResults] = await Promise.all([
        Promise.all(metricPromises),
        overviewPromise,
        weekdaysPromise,
        eventsPromise,
        outboundPromise,
        gscPromises,
      ]);

      // Collect all CSV files
      csvFiles.push(...metricResults);
      csvFiles.push(overview);
      csvFiles.push(weekdays);
      csvFiles.push(events);
      csvFiles.push(outbound);
      csvFiles.push(...gscResults);

      // Filter out empty files
      const nonEmptyFiles = csvFiles.filter(f => f.data.length > 0);

      if (nonEmptyFiles.length === 0) {
        toast.error("No data to export");
        return;
      }

      // Generate ZIP filename
      const dateStr = formatDateForFilename();
      const zipFilename = `rybbit-export-${site}-${dateStr}.zip`;

      // Download the ZIP
      await downloadZip(nonEmptyFiles, zipFilename);

      toast.success(`Exported ${nonEmptyFiles.length} files`);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="smIcon" onClick={handleExport} disabled={isExporting}>
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Export all data as CSV (ZIP)</p>
      </TooltipContent>
    </Tooltip>
  );
}
