import puppeteer from "puppeteer";
import { renderToStaticMarkup } from "react-dom/server";
import { DateTime } from "luxon";
import { eq } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import { sites } from "../../db/postgres/schema.js";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { processResults } from "../../api/analytics/utils/utils.js";
import { getTimeStatement } from "../../api/analytics/utils/timeWindow.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import {
  BreakdownDimension,
  buildBreakdownQuery,
  buildChartQuery,
  buildMetricsSpecForWindow,
  buildOverviewQuery,
  SiteMetricsSpec,
} from "../siteMetrics/siteMetrics.js";
import { PdfReportTemplate } from "./templates/PdfReportTemplate.js";
import type { PdfReportParams, PdfReportData, OverviewData, MetricData, ChartDataPoint } from "./pdfReportTypes.js";

class PdfReportService {
  private logger = createServiceLogger("pdf-report");

  async generatePdfReport(params: PdfReportParams): Promise<Buffer> {
    this.logger.info({ params }, "Generating PDF report");

    // Fetch all report data
    const reportData = await this.fetchReportData(params);

    // Render HTML
    const html = this.renderHtml(reportData);

    // Convert to PDF
    const pdfBuffer = await this.htmlToPdf(html);

    this.logger.info({ siteId: params.siteId }, "PDF report generated successfully");
    return pdfBuffer;
  }

  private async fetchReportData(params: PdfReportParams): Promise<PdfReportData> {
    const { siteId, startDate, endDate, timeZone, filters } = params;

    // Fetch site info
    const site = await db.query.sites.findFirst({
      where: eq(sites.siteId, siteId),
    });

    if (!site) {
      throw new Error(`Site not found: ${siteId}`);
    }

    // Calculate previous period (same duration before startDate). The current
    // window is inclusive of both boundary dates (getTimeStatement makes the end
    // exclusive at end_date + 1 day), so an N-day range spans floor(diff)+1 days.
    // The previous window must match that length, else every growth % is biased.
    const start = DateTime.fromISO(startDate, { zone: timeZone });
    const end = DateTime.fromISO(endDate, { zone: timeZone });
    const durationDays = Math.floor(end.diff(start, "days").days) + 1;

    const previousEnd = start.minus({ days: 1 });
    const previousStart = previousEnd.minus({ days: durationDays - 1 });

    // Build time statements using getTimeStatement for proper timezone handling
    const timeStatement = getTimeStatement({
      start_date: startDate,
      end_date: endDate,
      time_zone: timeZone,
    });

    const previousTimeStatement = getTimeStatement({
      start_date: previousStart.toISODate()!,
      end_date: previousEnd.toISODate()!,
      time_zone: timeZone,
    });

    // Each period gets its own qualifying-session CTE, bounded by that period's
    // time statement. Reusing the current cohort for the previous period would
    // bias every growth percentage.
    const filtersJson = filters ? JSON.stringify(filters) : "";
    const spec = buildMetricsSpecForWindow(filtersJson, siteId, timeStatement);
    const previousSpec = buildMetricsSpecForWindow(filtersJson, siteId, previousTimeStatement);

    // Determine bucket size based on date range
    const bucket = durationDays <= 1 ? "hour" : durationDays <= 60 ? "day" : "week";

    // Fetch all data in parallel
    const [
      overview,
      previousOverview,
      chartData,
      topCountries,
      topRegions,
      topCities,
      topPages,
      topReferrers,
      deviceBreakdown,
      topBrowsers,
      topOperatingSystems,
    ] = await Promise.all([
      this.fetchOverviewData(siteId, spec),
      this.fetchOverviewData(siteId, previousSpec),
      this.fetchChartData(siteId, timeZone, bucket, spec),
      this.fetchTopN(siteId, "country", spec),
      this.fetchTopN(siteId, "region", spec),
      this.fetchTopN(siteId, "city", spec),
      this.fetchTopN(siteId, "pathname", spec),
      this.fetchTopN(siteId, "referrer", spec),
      this.fetchTopN(siteId, "device_type", spec),
      this.fetchTopN(siteId, "browser", spec),
      this.fetchTopN(siteId, "operating_system", spec),
    ]);

    if (!overview) {
      throw new Error(`No data available for site ${siteId} in the selected period`);
    }

    return {
      siteId,
      siteName: site.name,
      siteDomain: site.domain,
      startDate,
      endDate,
      timeZone,
      generatedAt: DateTime.now().setZone(timeZone).toFormat("MMMM d, yyyy 'at' h:mm a ZZZZ"),
      overview,
      previousOverview,
      chartData,
      topCountries,
      topRegions,
      topCities,
      topPages,
      topReferrers,
      deviceBreakdown,
      topBrowsers,
      topOperatingSystems,
    };
  }

  private async fetchChartData(
    siteId: number,
    timeZone: string,
    bucket: "hour" | "day" | "week",
    spec: SiteMetricsSpec
  ): Promise<ChartDataPoint[]> {
    try {
      const bucketFn = bucket === "hour" ? "toStartOfHour" : bucket === "day" ? "toStartOfDay" : "toStartOfWeek";

      const query = buildChartQuery(spec, bucketFn);

      const result = await clickhouse.query({
        query,
        format: "JSONEachRow",
        query_params: {
          siteId,
          timeZone,
        },
      });

      return await processResults<ChartDataPoint>(result);
    } catch (error) {
      this.logger.error({ err: error, siteId }, "Error fetching chart data");
      return [];
    }
  }

  private async fetchOverviewData(siteId: number, spec: SiteMetricsSpec): Promise<OverviewData | null> {
    try {
      const result = await clickhouse.query({
        query: buildOverviewQuery(spec),
        format: "JSONEachRow",
        query_params: { siteId },
      });

      const data = await processResults<OverviewData>(result);
      return data[0] || null;
    } catch (error) {
      this.logger.error({ err: error, siteId }, "Error fetching overview data");
      return null;
    }
  }

  private async fetchTopN(
    siteId: number,
    dimension: BreakdownDimension,
    spec: SiteMetricsSpec,
    limit: number = 13
  ): Promise<MetricData[]> {
    try {
      const result = await clickhouse.query({
        query: buildBreakdownQuery(dimension, spec),
        format: "JSONEachRow",
        query_params: { siteId, limit },
      });

      return await processResults<MetricData>(result);
    } catch (error) {
      this.logger.error({ err: error, siteId, dimension }, "Error fetching top N data");
      return [];
    }
  }

  private renderHtml(data: PdfReportData): string {
    const element = PdfReportTemplate({ reportData: data });
    return renderToStaticMarkup(element);
  }

  private async htmlToPdf(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "0",
          right: "0",
          bottom: "0",
          left: "0",
        },
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }
}

export const pdfReportService = new PdfReportService();
