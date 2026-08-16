import * as cron from "node-cron";
import { DateTime } from "luxon";
import { eq } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import { organization, member, user, sites } from "../../db/postgres/schema.js";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getTimeStatement, processResults } from "../../api/analytics/utils/utils.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { sendWeeklyReportEmail } from "../../lib/email/email.js";
import { filterSitesByMemberAccess } from "../../lib/access.js";
import { IS_CLOUD } from "../../lib/const.js";
import {
  BreakdownDimension,
  buildBreakdownQuery,
  buildOverviewQuery,
  SiteMetricsSpec,
} from "../siteMetrics/siteMetrics.js";
import type { OverviewData, MetricData, SiteReport, OrganizationReport } from "./weeklyReportTypes.js";

const MAX_SITE_REPORTS_PER_ORG = 10;

class WeeklyReportService {
  private cronTask: cron.ScheduledTask | null = null;
  private logger = createServiceLogger("weekly-report");

  constructor() {}

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
    limit: number = 5
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

      // Format dates for ClickHouse (YYYY-MM-DD HH:mm:ss). The windows above are
      // UTC, and getTimeStatement anchors the comparison in UTC too — the bound
      // `toDateTime({date:String})` this replaced was interpreted in the
      // ClickHouse server's timezone, so a non-UTC server shifted the week.
      const formatDate = (date: DateTime) => date.toFormat("yyyy-MM-dd HH:mm:ss");
      const specFor = (from: DateTime, to: DateTime): SiteMetricsSpec => ({
        timeStatement: getTimeStatement({
          start_datetime: formatDate(from),
          end_datetime: formatDate(to),
        }),
      });

      const currentSpec = specFor(currentWeekStart, currentWeekEnd);
      const previousSpec = specFor(previousWeekStart, previousWeekEnd);

      const [currentWeek, previousWeek, topCountries, topPages, topReferrers, deviceBreakdown] = await Promise.all([
        this.fetchOverviewData(siteId, currentSpec),
        this.fetchOverviewData(siteId, previousSpec),
        this.fetchTopN(siteId, "country", currentSpec),
        this.fetchTopN(siteId, "pathname", currentSpec),
        this.fetchTopN(siteId, "referrer", currentSpec),
        this.fetchTopN(siteId, "device_type", currentSpec),
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
      this.logger.error({ err: error, siteId }, "Error generating site report");
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
        if (siteReports.length >= MAX_SITE_REPORTS_PER_ORG) {
          this.logger.info(
            { organizationId, totalSites: orgSites.length, limit: MAX_SITE_REPORTS_PER_ORG },
            "Reached site report limit for organization, skipping remaining sites"
          );
          break;
        }

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
      this.logger.error({ err: error, organizationId }, "Error generating organization report");
      return null;
    }
  }

  private async sendReportsToOrganization(report: OrganizationReport): Promise<void> {
    try {
      // Fetch all members of the organization with their access restrictions
      const members = await db
        .select({
          memberId: member.id,
          userId: member.userId,
          role: member.role,
          email: user.email,
          name: user.name,
          sendAutoEmailReports: user.sendAutoEmailReports,
          hasRestrictedSiteAccess: member.hasRestrictedSiteAccess,
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

        // Only report on sites the member can actually access
        let allowedSites = report.sites;
        if (memberData.role === "member") {
          allowedSites = await filterSitesByMemberAccess(
            report.sites,
            report.organizationId,
            memberData.userId,
            memberData.memberId,
            memberData.hasRestrictedSiteAccess
          );

          // Skip this member entirely if they have no site access
          if (allowedSites.length === 0) {
            continue;
          }
        }

        for (const site of allowedSites) {
          try {
            await sendWeeklyReportEmail(memberData.email, memberData.name, report.organizationName, site);
            this.logger.info(
              {
                organizationId: report.organizationId,
                siteId: site.siteId,
              },
              "Sent weekly report email for site"
            );
          } catch (error) {
            this.logger.error(
              { err: error, organizationId: report.organizationId, siteId: site.siteId },
              "Failed to send email to member for site"
            );
          }
        }
      }
    } catch (error) {
      this.logger.error({ err: error, organizationId: report.organizationId }, "Error sending reports to organization");
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
      this.logger.error({ err: error }, "Error in weekly report generation");
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
          this.logger.error({ err: error }, "Error during weekly report generation");
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
