import * as cron from "node-cron";
import { DateTime } from "luxon";
import { eq } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import { organization, member, user, sites } from "../../db/postgres/schema.js";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { processResults } from "../../api/analytics/utils/utils.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { sendWeeklyReportEmail } from "../../lib/email/email.js";
import { IS_CLOUD } from "../../lib/const.js";
import type { OverviewData, MetricData, SiteReport, OrganizationReport } from "./weeklyReportTypes.js";

class WeeklyReportService {
  private cronTask: cron.ScheduledTask | null = null;
  private logger = createServiceLogger("weekly-report");

  constructor() {}

  private async fetchOverviewData(siteId: number, startDate: string, endDate: string): Promise<OverviewData | null> {
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
          -- Session-level metrics
          SELECT
              COUNT() AS sessions,
              AVG(pages_in_session) AS pages_per_session,
              sumIf(1, pages_in_session = 1) / COUNT() AS bounce_rate,
              AVG(end_time - start_time) AS session_duration
          FROM
              (
                  -- One row per session
                  SELECT
                      session_id,
                      MIN(timestamp) AS start_time,
                      MAX(timestamp) AS end_time,
                      COUNT(CASE WHEN type = 'pageview' THEN 1 END) AS pages_in_session
                  FROM events
                  WHERE
                      site_id = {siteId:Int32}
                      AND timestamp >= toDateTime({startDate:String})
                      AND timestamp < toDateTime({endDate:String})
                  GROUP BY session_id
              )
          ) AS session_stats
          CROSS JOIN
          (
              -- Page-level and user-level metrics
              SELECT
                  COUNT(*)                   AS pageviews,
                  COUNT(DISTINCT user_id)    AS users
              FROM events
              WHERE
                  site_id = {siteId:Int32}
                  AND timestamp >= toDateTime({startDate:String})
                  AND timestamp < toDateTime({endDate:String})
                  AND type = 'pageview'
          ) AS page_stats`;

      const result = await clickhouse.query({
        query,
        format: "JSONEachRow",
        query_params: {
          siteId,
          startDate,
          endDate,
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
    startDate: string,
    endDate: string,
    limit: number = 5
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
                AND timestamp >= toDateTime({startDate:String})
                AND timestamp < toDateTime({endDate:String})
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
                AND timestamp >= toDateTime({startDate:String})
                AND timestamp < toDateTime({endDate:String})
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
                AND timestamp >= toDateTime({startDate:String})
                AND timestamp < toDateTime({endDate:String})
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
                AND timestamp >= toDateTime({startDate:String})
                AND timestamp < toDateTime({endDate:String})
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
          startDate,
          endDate,
          limit,
        },
      });

      return await processResults<MetricData>(result);
    } catch (error) {
      this.logger.error({ error, siteId, parameter }, "Error fetching top N data");
      return [];
    }
  }

  private async generateSiteReport(siteId: number, siteName: string, siteDomain: string): Promise<SiteReport | null> {
    try {
      // Use UTC timezone for consistency
      const now = DateTime.utc();

      // Calculate current week (last 7 days)
      const currentWeekEnd = now;
      const currentWeekStart = now.minus({ days: 7 });

      // Calculate previous week (8-14 days ago)
      const previousWeekEnd = currentWeekStart;
      const previousWeekStart = currentWeekStart.minus({ days: 7 });

      // Format dates for ClickHouse (YYYY-MM-DD HH:mm:ss)
      const formatDate = (date: DateTime) => date.toFormat("yyyy-MM-dd HH:mm:ss");

      const [currentWeek, previousWeek, topCountries, topPages, topReferrers, deviceBreakdown] = await Promise.all([
        this.fetchOverviewData(siteId, formatDate(currentWeekStart), formatDate(currentWeekEnd)),
        this.fetchOverviewData(siteId, formatDate(previousWeekStart), formatDate(previousWeekEnd)),
        this.fetchTopN(siteId, "country", formatDate(currentWeekStart), formatDate(currentWeekEnd), 5),
        this.fetchTopN(siteId, "pathname", formatDate(currentWeekStart), formatDate(currentWeekEnd), 5),
        this.fetchTopN(siteId, "referrer", formatDate(currentWeekStart), formatDate(currentWeekEnd), 5),
        this.fetchTopN(siteId, "device_type", formatDate(currentWeekStart), formatDate(currentWeekEnd), 5),
      ]);

      if (!currentWeek) {
        return null;
      }

      // Skip sites with no pageviews
      if (!currentWeek.pageviews || currentWeek.pageviews === 0) {
        return null;
      }

      return {
        siteId,
        siteName,
        siteDomain,
        currentWeek,
        previousWeek: previousWeek || {
          sessions: 0,
          pageviews: 0,
          users: 0,
          pages_per_session: 0,
          bounce_rate: 0,
          session_duration: 0,
        },
        topCountries,
        topPages,
        topReferrers,
        deviceBreakdown,
      };
    } catch (error) {
      this.logger.error({ error, siteId }, "Error generating site report");
      return null;
    }
  }

  private async generateOrganizationReport(organizationId: string): Promise<OrganizationReport | null> {
    try {
      // Fetch organization details
      const [org] = await db.select().from(organization).where(eq(organization.id, organizationId));

      if (!org) {
        return null;
      }

      // Fetch all sites for this organization
      const orgSites = await db.select().from(sites).where(eq(sites.organizationId, org.id));

      if (orgSites.length === 0) {
        return null;
      }

      const siteReports: SiteReport[] = [];

      for (const site of orgSites) {
        const report = await this.generateSiteReport(site.siteId, site.name, site.domain);
        if (report) {
          siteReports.push(report);
        }
      }

      if (siteReports.length === 0) {
        return null;
      }

      return {
        organizationId: org.id,
        organizationName: org.name,
        sites: siteReports,
      };
    } catch (error) {
      this.logger.error({ error, organizationId }, "Error generating organization report");
      return null;
    }
  }

  private async sendReportsToOrganization(report: OrganizationReport): Promise<void> {
    try {
      // Fetch all members of the organization
      const members = await db
        .select({
          userId: member.userId,
          email: user.email,
          name: user.name,
          sendAutoEmailReports: user.sendAutoEmailReports,
        })
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(eq(member.organizationId, report.organizationId));

      // Send a separate email for each site to each member
      for (const memberData of members) {
        // Skip users who have disabled email reports
        if (memberData.sendAutoEmailReports === false) {
          continue;
        }

        for (const site of report.sites) {
          try {
            // Create a report with just this single site
            const singleSiteReport: OrganizationReport = {
              organizationId: report.organizationId,
              organizationName: report.organizationName,
              sites: [site],
            };

            await sendWeeklyReportEmail(memberData.email, memberData.name, singleSiteReport);
            this.logger.info(
              {
                email: memberData.email,
                organizationId: report.organizationId,
                siteId: site.siteId,
                siteName: site.siteName,
              },
              "Sent weekly report email for site"
            );
          } catch (error) {
            this.logger.error(
              { error, email: memberData.email, organizationId: report.organizationId, siteId: site.siteId },
              "Failed to send email to member for site"
            );
          }
        }
      }
    } catch (error) {
      this.logger.error({ error, organizationId: report.organizationId }, "Error sending reports to organization");
    }
  }

  public async generateAndSendReports(): Promise<void> {
    if (!IS_CLOUD) {
      this.logger.info("Skipping weekly reports for non-cloud instance");
      return;
    }

    this.logger.info("Starting weekly report generation and sending");

    try {
      // Fetch all organizations
      const organizations = await db.select().from(organization);
      const totalOrgs = organizations.length;

      this.logger.info({ totalOrganizations: totalOrgs }, "Processing organizations");

      let processedCount = 0;
      let sentCount = 0;

      for (let i = 0; i < organizations.length; i++) {
        const org = organizations[i];

        // Generate report for this organization
        const report = await this.generateOrganizationReport(org.id);

        if (report) {
          // Send reports immediately after generation
          await this.sendReportsToOrganization(report);
          sentCount++;
        }

        processedCount++;

        // Log progress every 10 organizations
        if (processedCount % 10 === 0 || processedCount === totalOrgs) {
          this.logger.info(
            { processed: processedCount, total: totalOrgs, sent: sentCount },
            `Progress: ${processedCount}/${totalOrgs} organizations processed, ${sentCount} reports sent`
          );
        }
      }

      this.logger.info(
        { totalProcessed: processedCount, totalSent: sentCount },
        "Completed weekly report generation and sending"
      );
    } catch (error) {
      this.logger.error({ error }, "Error in weekly report generation");
    }
  }

  private initializeWeeklyReportCron(): void {
    if (!IS_CLOUD) {
      this.logger.info("Skipping weekly report cron initialization for non-cloud instance");
      return;
    }

    this.logger.info("Initializing weekly report cron");

    // Schedule weekly reports to run every Monday at midnight UTC
    this.cronTask = cron.schedule(
      "0 0 * * 1",
      async () => {
        try {
          await this.generateAndSendReports();
        } catch (error) {
          this.logger.error(error as Error, "Error during weekly report generation");
        }
      },
      { timezone: "UTC" }
    );

    this.logger.info("Weekly report cron initialized (runs every Monday at midnight UTC)");
  }

  public stopWeeklyReportCron(): void {
    if (this.cronTask) {
      this.cronTask.stop();
      this.logger.info("Weekly report cron stopped");
    }
  }

  public startWeeklyReportCron(): void {
    this.initializeWeeklyReportCron();
  }
}

// Create a singleton instance
export const weeklyReportService = new WeeklyReportService();
