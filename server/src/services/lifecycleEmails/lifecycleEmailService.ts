import { and, eq, gt, inArray, like } from "drizzle-orm";
import { DateTime } from "luxon";
import * as cron from "node-cron";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { db } from "../../db/postgres/postgres.js";
import { goals, lifecycleEmailLog, member, sites, user } from "../../db/postgres/schema.js";
import { IS_CLOUD } from "../../lib/const.js";
import { cancelScheduledEmail, isContactUnsubscribed, sendLifecycleEmail } from "../../lib/email/email.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { signExpiringPayload } from "../../lib/signedToken.js";
import * as content from "./lifecycleContent.js";
import { detectPlatform, platformForKey, type PlatformInfo } from "./platformDetect.js";

/**
 * State-machine lifecycle emails. Every email is triggered by a state
 * transition or a timeout inside a state - never by a timer from signup.
 * The cron re-evaluates real state (Postgres + ClickHouse) at send time, and
 * the unique (userId, emailKey) index on lifecycle_email_log makes each email
 * fire at most once. At most one email per user per run (enforced across both
 * passes via a per-run set), with a minimum gap between educational sends.
 *
 * Concurrency: the cron runs on the cluster primary only, so a single
 * evaluator holds the "one email per user per run" invariant. If this ever
 * moves to multiple replicas, the per-run set must become a distributed
 * claim - the unique key alone only dedupes per emailKey, not per user.
 */

const COHORT_DAYS = 30; // users/sites older than this never enter the onboarding flow
const MIN_GAP_HOURS = 48; // between non-transition emails to the same user
const CHECK_INSTALL_TTL_SECONDS = 30 * 24 * 3600;
const NEGATIVE_CACHE_TTL_MS = 12 * 3600 * 1000; // don't re-run a no-result ClickHouse probe for this long

interface SiteStats {
  firstEvent: DateTime;
  lastEvent: DateTime;
  total: number;
  pageviews: number;
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
  private legacyTipsCancelled = false;
  private lastWentQuietAt: DateTime | null = null;
  /** cacheKey -> epoch ms until which a known-negative ClickHouse probe is not repeated */
  private negativeCache = new Map<string, number>();
  /** users already sent an email in the current run, shared across both passes */
  private emailedThisRun = new Set<string>();

  // -------------------------------------------------------------------------
  // Data helpers
  // -------------------------------------------------------------------------

  private async fetchSiteStats(siteIds: number[]): Promise<Map<number, SiteStats>> {
    const stats = new Map<number, SiteStats>();
    if (siteIds.length === 0) return stats;

    // Cohort sites are < COHORT_DAYS old, so a bounded time predicate covers
    // their full history and keeps the scan on the primary-key index.
    const result = await clickhouse.query({
      query: `
        SELECT
          site_id,
          min(timestamp) AS first_event,
          max(timestamp) AS last_event,
          count() AS total,
          countIf(type = 'pageview') AS pageviews,
          countIf(type = 'custom_event') AS custom_events
        FROM events
        WHERE site_id IN ({siteIds:Array(Int32)})
          AND timestamp > now() - INTERVAL ${COHORT_DAYS + 10} DAY
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
      pageviews: string | number;
      custom_events: string | number;
    }>();

    for (const row of rows) {
      stats.set(Number(row.site_id), {
        firstEvent: parseTs(row.first_event),
        lastEvent: parseTs(row.last_event),
        total: Number(row.total),
        pageviews: Number(row.pageviews),
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
          AND timestamp > now() - INTERVAL 7 DAY
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
          AND timestamp > now() - INTERVAL ${COHORT_DAYS + 10} DAY
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
            AND timestamp > now() - INTERVAL ${COHORT_DAYS + 10} DAY
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
    const cacheKey = `conv:${siteId}`;
    const retryAfter = this.negativeCache.get(cacheKey);
    if (retryAfter && retryAfter > Date.now()) return null;

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
    const path = rows[0]?.pathname || null;
    if (!path) this.negativeCache.set(cacheKey, Date.now() + NEGATIVE_CACHE_TTL_MS);
    return path;
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

  private checkInstallUrl(siteId: number, domain: string): string {
    const { exp, sig } = signExpiringPayload(`check-install:${siteId}:${domain}`, CHECK_INSTALL_TTL_SECONDS);
    return `${process.env.BASE_URL}/api/site/check-install?siteId=${siteId}&domain=${encodeURIComponent(domain)}&exp=${exp}&sig=${sig}`;
  }

  /**
   * Record + send. The insert happens first with the unique index as the guard,
   * so a re-entrant run can never double-send; if the send then fails, the row
   * is removed so the next tick retries. The lifecycle key doubles as the
   * Resend idempotency key so an "accepted but response lost" retry can't
   * deliver twice.
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
      const sent = await sendLifecycleEmail(email, message.subject, message.text, `lifecycle:${userId}:${emailKey}`);
      if (!sent) {
        await db.delete(lifecycleEmailLog).where(eq(lifecycleEmailLog.id, inserted.id));
        return false;
      }
      this.emailedThisRun.add(userId);
      this.logger.info({ userId, emailKey, siteId }, "Sent lifecycle email");
      return true;
    } catch (error) {
      this.logger.error({ err: error, userId, emailKey }, "Error sending lifecycle email");
      await db.delete(lifecycleEmailLog).where(eq(lifecycleEmailLog.id, inserted.id));
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Rollout: cancel tips the retired drip already scheduled in Resend
  // -------------------------------------------------------------------------

  private async cancelLegacyScheduledTips(): Promise<void> {
    if (this.legacyTipsCancelled) return;
    this.legacyTipsCancelled = true;

    try {
      // The old drip scheduled at most 5 days out, so only recent signups can
      // still have pending sends worth cancelling.
      const cutoff = DateTime.utc().minus({ days: 10 }).toSQL({ includeOffset: false })!;
      const users = await db
        .select({ id: user.id, scheduledTipEmailIds: user.scheduledTipEmailIds })
        .from(user)
        .where(gt(user.createdAt, cutoff));

      for (const u of users) {
        const ids = (u.scheduledTipEmailIds as string[]) || [];
        if (ids.length === 0) continue;
        for (const emailId of ids) {
          await cancelScheduledEmail(emailId);
        }
        await db.update(user).set({ scheduledTipEmailIds: [] }).where(eq(user.id, u.id));
        this.logger.info({ userId: u.id, cancelled: ids.length }, "Cancelled legacy scheduled tip emails");
      }
    } catch (error) {
      this.legacyTipsCancelled = false; // retry next run
      this.logger.error({ err: error }, "Error cancelling legacy scheduled tips");
    }
  }

  // -------------------------------------------------------------------------
  // Onboarding pass: users in their first COHORT_DAYS
  // -------------------------------------------------------------------------

  private async processOnboarding(now: DateTime): Promise<void> {
    const cohortStart = now.minus({ days: COHORT_DAYS });

    // No emailVerified filter: this app doesn't require (or send) email
    // verification on password signup, so gating on it would exclude nearly
    // every normal signup. Bounce protection comes from Resend suppression
    // (isContactUnsubscribed) checked before every send.
    const users = await db
      .select({ id: user.id, email: user.email, name: user.name, createdAt: user.createdAt })
      .from(user)
      .where(gt(user.createdAt, cohortStart.toSQL({ includeOffset: false })!));
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

    // --- State: no site created ---
    if (userSites.length === 0) {
      if (!sentLog.has("no_site_1")) {
        if (signupAge < 2) return;
        if (await unsubscribed()) return;
        await this.sendOnce(u.id, u.email, "no_site_1", null, () => content.noSite1(u.name));
      } else if (!sentLog.has("no_site_2") && signupAge >= 72 && gapElapsed) {
        if (await unsubscribed()) return;
        await this.sendOnce(u.id, u.email, "no_site_2", null, () => content.noSite2(u.name));
      }
      return;
    }

    // --- Install track: evaluated per site, so a working site doesn't
    // suppress install help for the owner's other new sites ---
    const noDataSites = userSites
      .filter(site => !stats.get(site.siteId) && now.diff(site.createdAt, "days").days < COHORT_DAYS)
      .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());

    for (const site of noDataSites) {
      const siteAge = now.diff(site.createdAt, "hours").hours;
      const snippetKey = `install_snippet:${site.siteId}`;
      const checkKey = `install_check:${site.siteId}`;
      const finalKey = `install_final:${site.siteId}`;
      const snippetSentAt = sentLog.get(snippetKey);
      const checkSentAt = sentLog.get(checkKey);

      if (!sentLog.has(snippetKey)) {
        // The snippet email is the user's next step right after creating a
        // site; it is exempt from the educational gap.
        if (siteAge < 1) continue;
        if (await unsubscribed()) return;
        const sent = await this.sendOnce(u.id, u.email, snippetKey, site.siteId, async () => {
          const platform = await this.resolvePlatform(site);
          return content.installSnippet(site.domain, site.siteId, platform, u.name);
        });
        if (sent) return;
      } else if (!sentLog.has(checkKey) && snippetSentAt && now.diff(snippetSentAt, "hours").hours >= 24) {
        // Timed from the snippet email, not site age, so a pre-existing site
        // picked up at rollout doesn't get two install emails in one hour.
        if (await unsubscribed()) return;
        const sent = await this.sendOnce(u.id, u.email, checkKey, site.siteId, () =>
          content.installCheck(site.domain, this.checkInstallUrl(site.siteId, site.domain), u.name)
        );
        if (sent) return;
      } else if (!sentLog.has(finalKey) && checkSentAt && now.diff(checkSentAt, "hours").hours >= 96 && gapElapsed) {
        if (await unsubscribed()) return;
        const sent = await this.sendOnce(u.id, u.email, finalKey, site.siteId, () =>
          content.installFinal(site.domain, u.name)
        );
        if (sent) return;
      }
    }

    // --- State: data flowing. Value emails keyed to data age, not signup age ---
    if (!gapElapsed) return;

    for (const site of userSites) {
      const s = stats.get(site.siteId);
      if (!s || s.total === 0) continue;
      const dataAgeDays = now.diff(s.firstEvent, "days").days;

      // Pageview count comes from the batched stats, so a custom-event-only
      // site is skipped without a per-tick ClickHouse probe.
      if (dataAgeDays >= 3 && dataAgeDays < 14 && s.pageviews > 0 && !sentLog.has(`first_days:${site.siteId}`)) {
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
    // Candidates: sites with events in the last 7 days whose latest event is
    // older than 48h. The 7-day window (vs a hard 48-60h band) means a cron
    // outage longer than the band can't silently skip an alert; the per-outage
    // email key plus the 30-day per-site cooldown below prevent repeats.
    const result = await clickhouse.query({
      query: `
        SELECT site_id, max(timestamp) AS last_event
        FROM events
        WHERE timestamp > now() - INTERVAL 7 DAY
        GROUP BY site_id
        HAVING last_event < now() - INTERVAL 48 HOUR
      `,
      format: "JSONEachRow",
    });
    const quietRows = await result.json<{ site_id: number; last_event: string }>();
    if (quietRows.length === 0) return;

    const quietSiteIds = quietRows.map(r => Number(r.site_id));

    // "Established" check, bounded: at least 100 events in the 3 weeks before
    // going quiet - a scratch site with a handful of test hits gets no alert.
    const volumeResult = await clickhouse.query({
      query: `
        SELECT site_id, count() AS total
        FROM events
        WHERE site_id IN ({siteIds:Array(Int32)})
          AND timestamp > now() - INTERVAL 21 DAY
        GROUP BY site_id
        HAVING total >= 100
      `,
      format: "JSONEachRow",
      query_params: { siteIds: quietSiteIds },
    });
    const establishedIds = new Set((await volumeResult.json<{ site_id: number }>()).map(r => Number(r.site_id)));

    const candidates = quietRows.filter(r => establishedIds.has(Number(r.site_id)));
    if (candidates.length === 0) return;

    const quietSites = await db
      .select({ siteId: sites.siteId, domain: sites.domain, organizationId: sites.organizationId })
      .from(sites)
      .where(inArray(sites.siteId, candidates.map(r => Number(r.site_id))));
    if (quietSites.length === 0) return;

    // 30-day per-site cooldown: a recovered-then-quiet-again site alerts at
    // most monthly even though each outage gets its own email key.
    const recentQuietLogs = await db
      .select({ siteId: lifecycleEmailLog.siteId, emailKey: lifecycleEmailLog.emailKey })
      .from(lifecycleEmailLog)
      .where(
        and(
          like(lifecycleEmailLog.emailKey, "went_quiet:%"),
          gt(lifecycleEmailLog.sentAt, now.minus({ days: 30 }).toSQL({ includeOffset: false })!)
        )
      );
    const recentlyAlerted = new Set(recentQuietLogs.map(r => r.siteId));

    const orgIds = [...new Set(quietSites.map(s => s.organizationId).filter((id): id is string => !!id))];
    const owners =
      orgIds.length > 0
        ? await db
            .select({ organizationId: member.organizationId, userId: user.id, email: user.email, name: user.name })
            .from(member)
            .innerJoin(user, eq(member.userId, user.id))
            .where(and(inArray(member.organizationId, orgIds), eq(member.role, "owner")))
        : [];

    const ownerByOrg = new Map(owners.map(o => [o.organizationId, o]));
    const lastEventBySite = new Map(quietRows.map(r => [Number(r.site_id), parseTs(r.last_event)]));

    for (const site of quietSites) {
      if (recentlyAlerted.has(site.siteId)) continue;
      const owner = site.organizationId ? ownerByOrg.get(site.organizationId) : null;
      if (!owner) continue;
      // One email per user per run, across both passes: an owner with five
      // quiet sites (or one who just got an onboarding email) gets one message.
      if (this.emailedThisRun.has(owner.userId)) continue;
      try {
        if (await isContactUnsubscribed(owner.email)) continue;
        const lastEvent = lastEventBySite.get(site.siteId);
        // Per-outage key: the date of the last event identifies the outage, so
        // a site that recovers and goes quiet again next month can alert again.
        const outageKey = `went_quiet:${site.siteId}:${lastEvent?.toFormat("yyyy-MM-dd") ?? "unknown"}`;
        await this.sendOnce(owner.userId, owner.email, outageKey, site.siteId, () =>
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
    this.emailedThisRun = new Set();
    const now = DateTime.utc();
    try {
      await this.cancelLegacyScheduledTips();
      await this.processOnboarding(now);
      // The went-quiet scan covers the whole events table (bounded to 7 days);
      // hourly is plenty for a 48h-silence alert.
      if (!this.lastWentQuietAt || now.diff(this.lastWentQuietAt, "minutes").minutes >= 55) {
        this.lastWentQuietAt = now;
        await this.processWentQuiet(now);
      }
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
