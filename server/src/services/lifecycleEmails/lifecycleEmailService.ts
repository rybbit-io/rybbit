import { and, eq, gt, inArray } from "drizzle-orm";
import { DateTime } from "luxon";
import * as cron from "node-cron";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { db } from "../../db/postgres/postgres.js";
import { goals, lifecycleEmailLog, member, sites, user } from "../../db/postgres/schema.js";
import { IS_CLOUD } from "../../lib/const.js";
import { isContactUnsubscribed, sendLifecycleEmail } from "../../lib/email/email.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { signPayload } from "../../lib/signedToken.js";
import * as content from "./lifecycleContent.js";
import { detectPlatform, platformForKey, type PlatformInfo } from "./platformDetect.js";

/**
 * State-machine lifecycle emails. Every email is triggered by a state
 * transition or a timeout inside a state - never by a timer from signup.
 * The cron re-evaluates real state (Postgres + ClickHouse) at send time, and
 * the unique (userId, emailKey) index on lifecycle_email_log makes each email
 * fire at most once. At most one email per user per tick, with a minimum gap
 * between educational sends.
 */

const COHORT_DAYS = 30; // users/sites older than this never enter the onboarding flow
const MIN_GAP_HOURS = 48; // between non-transition emails to the same user

interface SiteStats {
  firstEvent: DateTime;
  lastEvent: DateTime;
  total: number;
  customEvents: number;
}

interface OwnedSite {
  siteId: number;
  domain: string;
  createdAt: DateTime;
  detectedPlatform: string | null;
}

const parseTs = (value: string): DateTime => {
  const sql = DateTime.fromSQL(value, { zone: "utc" });
  return sql.isValid ? sql : DateTime.fromISO(value, { zone: "utc" });
};

const countryName = (code: string | null): string | null => {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
};

class LifecycleEmailService {
  private cronTask: cron.ScheduledTask | null = null;
  private logger = createServiceLogger("lifecycle-emails");
  private running = false;

  // -------------------------------------------------------------------------
  // Data helpers
  // -------------------------------------------------------------------------

  private async fetchSiteStats(siteIds: number[]): Promise<Map<number, SiteStats>> {
    const stats = new Map<number, SiteStats>();
    if (siteIds.length === 0) return stats;

    const result = await clickhouse.query({
      query: `
        SELECT
          site_id,
          min(timestamp) AS first_event,
          max(timestamp) AS last_event,
          count() AS total,
          countIf(type = 'custom_event') AS custom_events
        FROM events
        WHERE site_id IN ({siteIds:Array(Int32)})
        GROUP BY site_id
      `,
      format: "JSONEachRow",
      query_params: { siteIds },
    });

    const rows = await result.json<{
      site_id: number;
      first_event: string;
      last_event: string;
      total: string | number;
      custom_events: string | number;
    }>();

    for (const row of rows) {
      stats.set(Number(row.site_id), {
        firstEvent: parseTs(row.first_event),
        lastEvent: parseTs(row.last_event),
        total: Number(row.total),
        customEvents: Number(row.custom_events),
      });
    }
    return stats;
  }

  private async fetchFirstPageview(siteId: number): Promise<{ country: string | null } | null> {
    const result = await clickhouse.query({
      query: `
        SELECT country FROM events
        WHERE site_id = {siteId:Int32} AND type = 'pageview'
        ORDER BY timestamp ASC
        LIMIT 1
      `,
      format: "JSONEachRow",
      query_params: { siteId },
    });
    const rows = await result.json<{ country: string }>();
    if (rows.length === 0) return null;
    return { country: rows[0].country || null };
  }

  private async fetchFirstDaysStats(siteId: number): Promise<content.FirstDaysStats | null> {
    const overviewResult = await clickhouse.query({
      query: `
        SELECT uniq(session_id) AS sessions, countIf(type = 'pageview') AS pageviews
        FROM events
        WHERE site_id = {siteId:Int32}
      `,
      format: "JSONEachRow",
      query_params: { siteId },
    });
    const [overview] = await overviewResult.json<{ sessions: string | number; pageviews: string | number }>();
    if (!overview || Number(overview.pageviews) === 0) return null;

    const topOf = async (expression: string, condition: string): Promise<string | null> => {
      const result = await clickhouse.query({
        query: `
          SELECT ${expression} AS value, count() AS c
          FROM events
          WHERE site_id = {siteId:Int32} AND type = 'pageview' AND ${condition}
          GROUP BY value
          ORDER BY c DESC
          LIMIT 1
        `,
        format: "JSONEachRow",
        query_params: { siteId },
      });
      const rows = await result.json<{ value: string }>();
      return rows[0]?.value || null;
    };

    return {
      sessions: Number(overview.sessions),
      pageviews: Number(overview.pageviews),
      topReferrer: await topOf("domainWithoutWWW(referrer)", "referrer != ''"),
      topPage: await topOf("pathname", "pathname != ''"),
    };
  }

  private async fetchConvertingPath(siteId: number): Promise<string | null> {
    const result = await clickhouse.query({
      query: `
        SELECT pathname, count() AS c
        FROM events
        WHERE site_id = {siteId:Int32}
          AND type = 'pageview'
          AND timestamp > now() - INTERVAL 14 DAY
          AND match(pathname, '(thank|success|checkout|confirmation|purchase|order-complete|welcome)')
        GROUP BY pathname
        ORDER BY c DESC
        LIMIT 1
      `,
      format: "JSONEachRow",
      query_params: { siteId },
    });
    const rows = await result.json<{ pathname: string }>();
    return rows[0]?.pathname || null;
  }

  private async resolvePlatform(site: OwnedSite): Promise<PlatformInfo | null> {
    const known = platformForKey(site.detectedPlatform);
    if (known) return known;

    const detected = await detectPlatform(site.domain);
    if (detected) {
      await db.update(sites).set({ detectedPlatform: detected.key }).where(eq(sites.siteId, site.siteId));
    }
    return detected;
  }

  private checkInstallUrl(domain: string): string {
    const sig = signPayload(`check-install:${domain}`);
    return `${process.env.BASE_URL}/api/site/check-install?domain=${encodeURIComponent(domain)}&sig=${sig}`;
  }

  /**
   * Record + send. The insert happens first with the unique index as the guard,
   * so a concurrent or re-entrant run can never double-send; if the send then
   * fails, the row is removed so the next tick retries.
   */
  private async sendOnce(
    userId: string,
    email: string,
    emailKey: string,
    siteId: number | null,
    build: () => Promise<content.LifecycleEmail | null> | content.LifecycleEmail | null
  ): Promise<boolean> {
    const [inserted] = await db
      .insert(lifecycleEmailLog)
      .values({ userId, emailKey, siteId })
      .onConflictDoNothing()
      .returning({ id: lifecycleEmailLog.id });
    if (!inserted) return false; // already sent

    try {
      const message = await build();
      if (!message) {
        await db.delete(lifecycleEmailLog).where(eq(lifecycleEmailLog.id, inserted.id));
        return false;
      }
      const sent = await sendLifecycleEmail(email, message.subject, message.text);
      if (!sent) {
        await db.delete(lifecycleEmailLog).where(eq(lifecycleEmailLog.id, inserted.id));
        return false;
      }
      this.logger.info({ userId, emailKey, siteId }, "Sent lifecycle email");
      return true;
    } catch (error) {
      this.logger.error({ err: error, userId, emailKey }, "Error sending lifecycle email");
      await db.delete(lifecycleEmailLog).where(eq(lifecycleEmailLog.id, inserted.id));
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Onboarding pass: users in their first COHORT_DAYS
  // -------------------------------------------------------------------------

  private async processOnboarding(now: DateTime): Promise<void> {
    const cohortStart = now.minus({ days: COHORT_DAYS });

    const users = await db
      .select({ id: user.id, email: user.email, name: user.name, createdAt: user.createdAt })
      .from(user)
      .where(and(gt(user.createdAt, cohortStart.toSQL({ includeOffset: false })!), eq(user.emailVerified, true)));
    if (users.length === 0) return;

    const userIds = users.map(u => u.id);
    const memberships = await db
      .select({ userId: member.userId, organizationId: member.organizationId, role: member.role })
      .from(member)
      .where(inArray(member.userId, userIds));

    const ownedOrgsByUser = new Map<string, string[]>();
    const anyMembership = new Set<string>();
    for (const m of memberships) {
      anyMembership.add(m.userId);
      if (m.role === "owner") {
        ownedOrgsByUser.set(m.userId, [...(ownedOrgsByUser.get(m.userId) ?? []), m.organizationId]);
      }
    }

    const allOwnedOrgIds = [...new Set([...ownedOrgsByUser.values()].flat())];
    const orgSites =
      allOwnedOrgIds.length > 0
        ? await db
            .select({
              siteId: sites.siteId,
              domain: sites.domain,
              createdAt: sites.createdAt,
              organizationId: sites.organizationId,
              detectedPlatform: sites.detectedPlatform,
            })
            .from(sites)
            .where(inArray(sites.organizationId, allOwnedOrgIds))
        : [];

    const sitesByOrg = new Map<string, OwnedSite[]>();
    for (const s of orgSites) {
      if (!s.organizationId || !s.createdAt) continue;
      const entry: OwnedSite = {
        siteId: s.siteId,
        domain: s.domain,
        createdAt: parseTs(s.createdAt),
        detectedPlatform: s.detectedPlatform,
      };
      sitesByOrg.set(s.organizationId, [...(sitesByOrg.get(s.organizationId) ?? []), entry]);
    }

    const allSiteIds = orgSites.map(s => s.siteId);
    const [stats, logs, siteGoals] = await Promise.all([
      this.fetchSiteStats(allSiteIds),
      db
        .select({ userId: lifecycleEmailLog.userId, emailKey: lifecycleEmailLog.emailKey, sentAt: lifecycleEmailLog.sentAt })
        .from(lifecycleEmailLog)
        .where(inArray(lifecycleEmailLog.userId, userIds)),
      allSiteIds.length > 0
        ? db.select({ siteId: goals.siteId }).from(goals).where(inArray(goals.siteId, allSiteIds))
        : Promise.resolve([]),
    ]);

    const logsByUser = new Map<string, Map<string, DateTime>>();
    for (const log of logs) {
      const map = logsByUser.get(log.userId) ?? new Map<string, DateTime>();
      map.set(log.emailKey, parseTs(log.sentAt));
      logsByUser.set(log.userId, map);
    }
    const sitesWithGoals = new Set(siteGoals.map(g => g.siteId));

    for (const u of users) {
      try {
        const ownedOrgs = ownedOrgsByUser.get(u.id) ?? [];
        // Invited teammates (members of someone else's org, owners of none) get no onboarding
        if (ownedOrgs.length === 0 && anyMembership.has(u.id)) continue;

        const userSites = ownedOrgs.flatMap(orgId => sitesByOrg.get(orgId) ?? []);
        await this.processUser(now, u, userSites, stats, logsByUser.get(u.id) ?? new Map(), sitesWithGoals);
      } catch (error) {
        this.logger.error({ err: error, userId: u.id }, "Error processing user lifecycle state");
      }
    }
  }

  /** Evaluate one user's state and send at most one email. */
  private async processUser(
    now: DateTime,
    u: { id: string; email: string; name: string; createdAt: string },
    userSites: OwnedSite[],
    stats: Map<number, SiteStats>,
    sentLog: Map<string, DateTime>,
    sitesWithGoals: Set<number>
  ): Promise<void> {
    const lastSent = [...sentLog.values()].sort((a, b) => b.toMillis() - a.toMillis())[0] ?? null;
    const gapElapsed = !lastSent || now.diff(lastSent, "hours").hours >= MIN_GAP_HOURS;
    const signupAge = now.diff(parseTs(u.createdAt), "hours").hours;

    const unsubscribed = () => isContactUnsubscribed(u.email);

    // --- Transition: a site just received its first data -> "you're live" ---
    // Exempt from the gap; it's a confirmation, not education. Only fires while
    // the first event is fresh so pre-existing sites don't get it late.
    for (const site of userSites) {
      const s = stats.get(site.siteId);
      if (!s || s.total === 0) continue;
      const firstEventAge = now.diff(s.firstEvent, "hours").hours;
      if (firstEventAge > 72) continue;
      if (sentLog.has(`site_live:${site.siteId}`)) continue;
      if (await unsubscribed()) return;

      const sent = await this.sendOnce(u.id, u.email, `site_live:${site.siteId}`, site.siteId, async () => {
        const first = await this.fetchFirstPageview(site.siteId);
        return content.siteLive(site.domain, site.siteId, countryName(first?.country ?? null), u.name);
      });
      if (sent) return;
    }

    const hasAnyData = userSites.some(site => (stats.get(site.siteId)?.total ?? 0) > 0);

    // --- State: no site created ---
    if (userSites.length === 0) {
      if (signupAge >= 72 && sentLog.has("no_site_1") && gapElapsed) {
        if (await unsubscribed()) return;
        await this.sendOnce(u.id, u.email, "no_site_2", null, () => content.noSite2(u.name));
      } else if (signupAge >= 2 && !sentLog.has("no_site_1")) {
        if (await unsubscribed()) return;
        await this.sendOnce(u.id, u.email, "no_site_1", null, () => content.noSite1(u.name));
      }
      return;
    }

    // --- State: site created, no data anywhere ---
    if (!hasAnyData) {
      const site = [...userSites].sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis())[0];
      const siteAge = now.diff(site.createdAt, "hours").hours;

      if (siteAge >= 24 * 5 && sentLog.has(`install_check:${site.siteId}`) && gapElapsed) {
        if (await unsubscribed()) return;
        await this.sendOnce(u.id, u.email, `install_final:${site.siteId}`, site.siteId, () =>
          content.installFinal(site.domain, u.name)
        );
      } else if (siteAge >= 24 && sentLog.has(`install_snippet:${site.siteId}`)) {
        if (await unsubscribed()) return;
        await this.sendOnce(u.id, u.email, `install_check:${site.siteId}`, site.siteId, () =>
          content.installCheck(site.domain, this.checkInstallUrl(site.domain), u.name)
        );
      } else if (siteAge >= 1 && !sentLog.has(`install_snippet:${site.siteId}`)) {
        // The snippet email is the user's next step right after creating a site;
        // it is exempt from the educational gap.
        if (await unsubscribed()) return;
        await this.sendOnce(u.id, u.email, `install_snippet:${site.siteId}`, site.siteId, async () => {
          const platform = await this.resolvePlatform(site);
          return content.installSnippet(site.domain, site.siteId, platform, u.name);
        });
      }
      return;
    }

    // --- State: data flowing. Value emails keyed to data age, not signup age ---
    if (!gapElapsed) return;

    for (const site of userSites) {
      const s = stats.get(site.siteId);
      if (!s || s.total === 0) continue;
      const dataAgeDays = now.diff(s.firstEvent, "days").days;

      if (dataAgeDays >= 3 && dataAgeDays < 14 && !sentLog.has(`first_days:${site.siteId}`)) {
        if (await unsubscribed()) return;
        const sent = await this.sendOnce(u.id, u.email, `first_days:${site.siteId}`, site.siteId, async () => {
          const report = await this.fetchFirstDaysStats(site.siteId);
          return report ? content.firstDays(site.domain, site.siteId, report, u.name) : null;
        });
        if (sent) return;
      }

      // Evidence-based nudges: only when their data shows the feature applies
      if (dataAgeDays >= 7 && dataAgeDays < COHORT_DAYS && !sitesWithGoals.has(site.siteId) && !sentLog.has(`nudge_goals:${site.siteId}`)) {
        const path = await this.fetchConvertingPath(site.siteId);
        if (path) {
          if (await unsubscribed()) return;
          const sent = await this.sendOnce(u.id, u.email, `nudge_goals:${site.siteId}`, site.siteId, () =>
            content.nudgeGoals(site.domain, site.siteId, path, u.name)
          );
          if (sent) return;
        }
      }

      if (dataAgeDays >= 10 && dataAgeDays < COHORT_DAYS && s.customEvents === 0 && !sentLog.has(`nudge_events:${site.siteId}`)) {
        if (await unsubscribed()) return;
        const sent = await this.sendOnce(u.id, u.email, `nudge_events:${site.siteId}`, site.siteId, () =>
          content.nudgeEvents(site.domain, site.siteId, u.name)
        );
        if (sent) return;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Went-quiet pass: any site (not just new ones) that stopped sending data
  // -------------------------------------------------------------------------

  private async processWentQuiet(now: DateTime): Promise<void> {
    // Sites with a real history whose last event landed 48-60h ago. The 12h
    // window plus the unique email key means this fires exactly once per outage.
    const result = await clickhouse.query({
      query: `
        SELECT site_id, max(timestamp) AS last_event, count() AS total
        FROM events
        WHERE timestamp > now() - INTERVAL 90 DAY
        GROUP BY site_id
        HAVING total >= 100
          AND last_event < now() - INTERVAL 48 HOUR
          AND last_event > now() - INTERVAL 60 HOUR
      `,
      format: "JSONEachRow",
    });
    const quietRows = await result.json<{ site_id: number; last_event: string; total: string | number }>();
    if (quietRows.length === 0) return;

    const quietSiteIds = quietRows.map(r => Number(r.site_id));
    const quietSites = await db
      .select({ siteId: sites.siteId, domain: sites.domain, organizationId: sites.organizationId })
      .from(sites)
      .where(inArray(sites.siteId, quietSiteIds));
    if (quietSites.length === 0) return;

    const orgIds = [...new Set(quietSites.map(s => s.organizationId).filter((id): id is string => !!id))];
    const owners = await db
      .select({ organizationId: member.organizationId, userId: user.id, email: user.email, name: user.name })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(and(inArray(member.organizationId, orgIds), eq(member.role, "owner"), eq(user.emailVerified, true)));

    const ownerByOrg = new Map(owners.map(o => [o.organizationId, o]));
    const lastEventBySite = new Map(quietRows.map(r => [Number(r.site_id), parseTs(r.last_event)]));

    for (const site of quietSites) {
      const owner = site.organizationId ? ownerByOrg.get(site.organizationId) : null;
      if (!owner) continue;
      try {
        if (await isContactUnsubscribed(owner.email)) continue;
        const lastEvent = lastEventBySite.get(site.siteId);
        await this.sendOnce(owner.userId, owner.email, `went_quiet:${site.siteId}`, site.siteId, () =>
          content.wentQuiet(site.domain, site.siteId, lastEvent?.toFormat("MMMM d 'at' HH:mm 'UTC'") ?? "two days ago", owner.name)
        );
      } catch (error) {
        this.logger.error({ err: error, siteId: site.siteId }, "Error processing went-quiet email");
      }
    }
  }

  // -------------------------------------------------------------------------
  // Entry points
  // -------------------------------------------------------------------------

  async processLifecycleEmails(): Promise<void> {
    if (this.running) return;
    this.running = true;
    const now = DateTime.utc();
    try {
      await this.processOnboarding(now);
      await this.processWentQuiet(now);
    } catch (error) {
      this.logger.error({ err: error }, "Error in lifecycle email run");
    } finally {
      this.running = false;
    }
  }

  startLifecycleCron(): void {
    if (!IS_CLOUD) return;
    if (this.cronTask) {
      this.logger.warn("Lifecycle email cron already running");
      return;
    }

    // Every 10 minutes: state transitions like "first pageview arrived" should
    // reach the user while they're still at their desk.
    this.cronTask = cron.schedule("*/10 * * * *", () => void this.processLifecycleEmails(), { timezone: "UTC" });
    this.logger.info("Lifecycle email cron started - runs every 10 minutes");
  }

  stopLifecycleCron(): void {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
      this.logger.info("Lifecycle email cron stopped");
    }
  }
}

export const lifecycleEmailService = new LifecycleEmailService();
