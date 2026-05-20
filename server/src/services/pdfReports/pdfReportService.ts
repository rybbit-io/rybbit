import puppeteer from "puppeteer";
import { renderToStaticMarkup } from "react-dom/server";
import { DateTime } from "luxon";
import { eq } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import { sites } from "../../db/postgres/schema.js";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getTimeStatement, processResults } from "../../api/analytics/utils/utils.js";
import { getFilterStatement } from "../../api/analytics/utils/getFilterStatement.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
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

    // Calculate previous period (same duration before startDate)
    const start = DateTime.fromISO(startDate, { zone: timeZone });
    const end = DateTime.fromISO(endDate, { zone: timeZone });
    const durationDays = Math.ceil(end.diff(start, "days").days) || 1;

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

    const filterStatement = filters ? getFilterStatement(JSON.stringify(filters), siteId) : "";

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
      this.fetchOverviewData(siteId, timeStatement, filterStatement),
      this.fetchOverviewData(siteId, previousTimeStatement, filterStatement),
      this.fetchChartData(siteId, startDate, endDate, timeZone, bucket, filterStatement),
      this.fetchTopN(siteId, "country", timeStatement, 13, filterStatement),
      this.fetchTopN(siteId, "region", timeStatement, 13, filterStatement),
      this.fetchTopN(siteId, "city", timeStatement, 13, filterStatement),
      this.fetchTopN(siteId, "pathname", timeStatement, 13, filterStatement),
      this.fetchTopN(siteId, "referrer", timeStatement, 13, filterStatement),
      this.fetchTopN(siteId, "device_type", timeStatement, 13, filterStatement),
      this.fetchTopN(siteId, "browser", timeStatement, 13, filterStatement),
      this.fetchTopN(siteId, "operating_system", timeStatement, 13, filterStatement),
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
    startDate: string,
    endDate: string,
    timeZone: string,
    bucket: "hour" | "day" | "week",
    filterStatement: string
  ): Promise<ChartDataPoint[]> {
    try {
      const bucketFn = bucket === "hour" ? "toStartOfHour" : bucket === "day" ? "toStartOfDay" : "toStartOfWeek";

      const query = `
        SELECT
          toString(toTimeZone(${bucketFn}(toTimeZone(timestamp, {timeZone:String})), {timeZone:String})) AS time,
          COUNT(DISTINCT session_id) AS sessions,
          countIf(type = 'pageview') AS pageviews
        FROM events
        WHERE
          site_id = {siteId:Int32}
          AND timestamp >= toDateTime({startDate:String}, {timeZone:String})
          AND timestamp < toDateTime({endDate:String}, {timeZone:String}) + INTERVAL 1 DAY
          ${filterStatement}
        GROUP BY time
        ORDER BY time`;

      const result = await clickhouse.query({
        query,
        format: "JSONEachRow",
        query_params: {
          siteId,
          startDate,
          endDate,
          timeZone,
        },
      });

      return await processResults<ChartDataPoint>(result);
    } catch (error) {
      this.logger.error({ error, siteId }, "Error fetching chart data");
      return [];
    }
  }

  private async fetchOverviewData(
    siteId: number,
    timeStatement: string,
    filterStatement: string
  ): Promise<OverviewData | null> {
    try {
      const query = `SELECT
        session_stats.sessions,
        session_stats.pages_per_session,
        session_stats.bounce_rate * 100 AS bounce_rate,
        session_stats.session_duration,
        page_stats.pageviews,
        page_stats.users
      FROM
      (
          SELECT
              COUNT() AS sessions,
              AVG(pages_in_session) AS pages_per_session,
              sumIf(1, pages_in_session = 1) / COUNT() AS bounce_rate,
              AVG(end_time - start_time) AS session_duration
          FROM
              (
                  SELECT
                      session_id,
                      MIN(timestamp) AS start_time,
                      MAX(timestamp) AS end_time,
                      COUNT(CASE WHEN type = 'pageview' THEN 1 END) AS pages_in_session
                  FROM events
                  WHERE
                      site_id = {siteId:Int32}
                      ${timeStatement}
                      ${filterStatement}
                  GROUP BY session_id
              )
          ) AS session_stats
          CROSS JOIN
          (
              SELECT
                  COUNT(*)                   AS pageviews,
                  COUNT(DISTINCT user_id)    AS users
              FROM events
              WHERE
                  site_id = {siteId:Int32}
                  ${timeStatement}
                  AND type = 'pageview'
                  ${filterStatement}
          ) AS page_stats`;

      const result = await clickhouse.query({
        query,
        format: "JSONEachRow",
        query_params: {
          siteId,
        },
      });

      const data = await processResults<OverviewData>(result);
      return data[0] || null;
    } catch (error) {
      this.logger.error({ error, siteId }, "Error fetching overview data");
      return null;
    }
  }

  private async fetchTopN(
    siteId: number,
    parameter: string,
    timeStatement: string,
    limit: number = 10,
    filterStatement: string
  ): Promise<MetricData[]> {
    try {
      let query = "";

      if (parameter === "country") {
        query = `
          WITH PageStats AS (
            SELECT
              country as value,
              COUNT(distinct(session_id)) as unique_sessions,
              COUNT() as pageviews
            FROM events
            WHERE
                site_id = {siteId:Int32}
                AND country IS NOT NULL
                AND country <> ''
                ${timeStatement}
                ${filterStatement}
            GROUP BY value
          )
          SELECT
            value,
            unique_sessions as count,
            round((unique_sessions / sum(unique_sessions) OVER ()) * 100, 2) as percentage
          FROM PageStats
          ORDER BY count desc
          LIMIT {limit:Int32}`;
      } else if (parameter === "pathname") {
        query = `
          WITH EventTimes AS (
              SELECT
                  session_id,
                  pathname,
                  timestamp,
                  leadInFrame(timestamp) OVER (PARTITION BY session_id ORDER BY timestamp ROWS BETWEEN CURRENT ROW AND 1 FOLLOWING) as next_timestamp
              FROM events
              WHERE
                site_id = {siteId:Int32}
                AND type = 'pageview'
                ${timeStatement}
                ${filterStatement}
          ),
          PageDurations AS (
              SELECT
                  session_id,
                  pathname,
                  timestamp,
                  next_timestamp,
                  if(isNull(next_timestamp), 0, dateDiff('second', timestamp, next_timestamp)) as time_diff_seconds
              FROM EventTimes
          ),
          PathStats AS (
              SELECT
                  pathname,
                  count() as visits,
                  count(DISTINCT session_id) as unique_sessions
              FROM PageDurations
              GROUP BY pathname
          )
          SELECT
              pathname as value,
              unique_sessions as count,
              round((unique_sessions / sum(unique_sessions) OVER ()) * 100, 2) as percentage
          FROM PathStats
          ORDER BY unique_sessions DESC
          LIMIT {limit:Int32}`;
      } else if (parameter === "referrer") {
        query = `
          WITH PageStats AS (
            SELECT
              domainWithoutWWW(referrer) as value,
              COUNT(distinct(session_id)) as unique_sessions,
              COUNT() as pageviews
            FROM events
            WHERE
                site_id = {siteId:Int32}
                AND domainWithoutWWW(referrer) IS NOT NULL
                AND domainWithoutWWW(referrer) <> ''
                ${timeStatement}
                ${filterStatement}
            GROUP BY value
          )
          SELECT
            value,
            unique_sessions as count,
            round((unique_sessions / sum(unique_sessions) OVER ()) * 100, 2) as percentage
          FROM PageStats
          ORDER BY count desc
          LIMIT {limit:Int32}`;
      } else if (parameter === "device_type") {
        query = `
          WITH PageStats AS (
            SELECT
              device_type as value,
              COUNT(distinct(session_id)) as unique_sessions,
              COUNT() as pageviews
            FROM events
            WHERE
                site_id = {siteId:Int32}
                AND device_type IS NOT NULL
                AND device_type <> ''
                ${timeStatement}
                ${filterStatement}
            GROUP BY value
          )
          SELECT
            value,
            unique_sessions as count,
            round((unique_sessions / sum(unique_sessions) OVER ()) * 100, 2) as percentage
          FROM PageStats
          ORDER BY count desc
          LIMIT {limit:Int32}`;
      } else if (parameter === "browser") {
        query = `
          WITH PageStats AS (
            SELECT
              browser as value,
              COUNT(distinct(session_id)) as unique_sessions,
              COUNT() as pageviews
            FROM events
            WHERE
                site_id = {siteId:Int32}
                AND browser IS NOT NULL
                AND browser <> ''
                ${timeStatement}
                ${filterStatement}
            GROUP BY value
          )
          SELECT
            value,
            unique_sessions as count,
            round((unique_sessions / sum(unique_sessions) OVER ()) * 100, 2) as percentage
          FROM PageStats
          ORDER BY count desc
          LIMIT {limit:Int32}`;
      } else if (parameter === "operating_system") {
        query = `
          WITH PageStats AS (
            SELECT
              operating_system as value,
              COUNT(distinct(session_id)) as unique_sessions,
              COUNT() as pageviews
            FROM events
            WHERE
                site_id = {siteId:Int32}
                AND operating_system IS NOT NULL
                AND operating_system <> ''
                ${timeStatement}
                ${filterStatement}
            GROUP BY value
          )
          SELECT
            value,
            unique_sessions as count,
            round((unique_sessions / sum(unique_sessions) OVER ()) * 100, 2) as percentage
          FROM PageStats
          ORDER BY count desc
          LIMIT {limit:Int32}`;
      } else if (parameter === "region") {
        query = `
          WITH PageStats AS (
            SELECT
              region as value,
              COUNT(distinct(session_id)) as unique_sessions,
              COUNT() as pageviews
            FROM events
            WHERE
                site_id = {siteId:Int32}
                AND region IS NOT NULL
                AND region <> ''
                ${timeStatement}
                ${filterStatement}
            GROUP BY value
          )
          SELECT
            value,
            unique_sessions as count,
            round((unique_sessions / sum(unique_sessions) OVER ()) * 100, 2) as percentage
          FROM PageStats
          ORDER BY count desc
          LIMIT {limit:Int32}`;
      } else if (parameter === "city") {
        query = `
          WITH PageStats AS (
            SELECT
              city as value,
              COUNT(distinct(session_id)) as unique_sessions,
              COUNT() as pageviews
            FROM events
            WHERE
                site_id = {siteId:Int32}
                AND city IS NOT NULL
                AND city <> ''
                ${timeStatement}
                ${filterStatement}
            GROUP BY value
          )
          SELECT
            value,
            unique_sessions as count,
            round((unique_sessions / sum(unique_sessions) OVER ()) * 100, 2) as percentage
          FROM PageStats
          ORDER BY count desc
          LIMIT {limit:Int32}`;
      }

      const result = await clickhouse.query({
        query,
        format: "JSONEachRow",
        query_params: {
          siteId,
          limit,
        },
      });

      return await processResults<MetricData>(result);
    } catch (error) {
      this.logger.error({ error, siteId, parameter }, "Error fetching top N data");
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
