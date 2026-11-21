import { and, eq, inArray, like } from "drizzle-orm";
import { DateTime } from "luxon";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { db } from "../../db/postgres/postgres.js";
import { lifecycleEmailLog, member, user } from "../../db/postgres/schema.js";
import { isIdempotencyConflict, sendTrialGraceEmail } from "../../lib/email/email.js";
import type { TrialGraceSite, TrialGraceStage } from "../../lib/email/templates/TrialGraceEmail.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import type { TrialGrace } from "../../lib/subscriptionUtils.js";

const MIDWAY_AFTER_DAYS = 30;
const FINAL_NOTICE_DAYS = 7;
// A grace period already under way when this shipped can owe two notices at once; space them
// out instead of sending both from one cron run.
const MIN_DAYS_BETWEEN_NOTICES = 3;

/** Which notice the grace period calls for at `now`. Only ever moves forward. */
export function trialGraceStage(grace: TrialGrace, now: DateTime): TrialGraceStage {
  if (DateTime.fromJSDate(grace.endsAt).diff(now, "days").days <= FINAL_NOTICE_DAYS) return "final";
  if (now.diff(DateTime.fromJSDate(grace.trialEndedAt), "days").days >= MIDWAY_AFTER_DAYS) return "midway";
  return "started";
}

const parseTs = (value: string): DateTime => {
  const sql = DateTime.fromSQL(value, { zone: "utc" });
  return sql.isValid ? sql : DateTime.fromISO(value, { zone: "utc" });
};

/**
 * The emails an organization's owners get while its sites keep collecting after an unpaid trial
 * (see TRIAL_GRACE_DAYS). Each stage goes out once per owner and grace period: the
 * lifecycle_email_log row is claimed before sending and released if the send fails.
 *
 * A failed send can't be told apart from "accepted but the response was lost", so the retry
 * reuses the same Resend idempotency key. Resend then replays the original response, or, since
 * the traffic numbers have moved on, rejects the changed payload as a conflict, which means the
 * first one went out and the claim stays.
 */
class TrialGraceEmails {
  private logger = createServiceLogger("trial-grace");

  private async fetchSiteTraffic(
    siteIds: number[],
    since: Date
  ): Promise<Map<number, { visitors: number; pageviews: number }>> {
    const traffic = new Map<number, { visitors: number; pageviews: number }>();
    if (siteIds.length === 0) return traffic;

    const result = await clickhouse.query({
      query: `
        SELECT
          site_id,
          uniq(COALESCE(NULLIF(identified_user_id, ''), user_id)) AS visitors,
          countIf(type = 'pageview') AS pageviews
        FROM events
        WHERE site_id IN ({siteIds:Array(Int32)})
          AND timestamp >= toDateTime({since:String}, 'UTC')
        GROUP BY site_id
      `,
      format: "JSONEachRow",
      query_params: {
        siteIds,
        since: DateTime.fromJSDate(since, { zone: "utc" }).toFormat("yyyy-MM-dd HH:mm:ss"),
      },
    });
    const rows = await result.json<{ site_id: number; visitors: string | number; pageviews: string | number }>();
    for (const row of rows) {
      traffic.set(Number(row.site_id), { visitors: Number(row.visitors), pageviews: Number(row.pageviews) });
    }
    return traffic;
  }

  /** Sends the organization's owners the notice they are due now, if any. */
  async sendDue(
    org: { id: string; name: string },
    grace: TrialGrace,
    sites: Array<{ siteId: number; domain: string }>,
    now: DateTime = DateTime.utc()
  ): Promise<void> {
    // Stripe is still retrying the first charge and emails the customer about it itself.
    if (grace.retryingPayment) return;

    const stage = trialGraceStage(grace, now);
    const keyPrefix = `trial_grace:${grace.subscriptionId}:`;
    const emailKey = `${keyPrefix}${stage}`;

    const owners = await db
      .select({ userId: user.id, email: user.email })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(and(eq(member.organizationId, org.id), eq(member.role, "owner")));
    if (owners.length === 0) return;

    const sent = await db
      .select({
        userId: lifecycleEmailLog.userId,
        emailKey: lifecycleEmailLog.emailKey,
        sentAt: lifecycleEmailLog.sentAt,
      })
      .from(lifecycleEmailLog)
      .where(
        and(
          inArray(
            lifecycleEmailLog.userId,
            owners.map(owner => owner.userId)
          ),
          like(lifecycleEmailLog.emailKey, `${keyPrefix}%`)
        )
      );

    const due = owners.filter(owner => {
      const mine = sent.filter(row => row.userId === owner.userId);
      if (mine.some(row => row.emailKey === emailKey)) return false;
      return mine.every(row => now.diff(parseTs(row.sentAt), "days").days >= MIN_DAYS_BETWEEN_NOTICES);
    });
    if (due.length === 0) return;

    const traffic = await this.fetchSiteTraffic(
      sites.map(site => site.siteId),
      grace.trialEndedAt
    );
    const siteTraffic: TrialGraceSite[] = sites
      .map(site => ({ domain: site.domain, visitors: 0, pageviews: 0, ...traffic.get(site.siteId) }))
      .sort((a, b) => b.visitors - a.visitors || b.pageviews - a.pageviews);

    for (const owner of due) {
      const [claimed] = await db
        .insert(lifecycleEmailLog)
        .values({ userId: owner.userId, emailKey })
        .onConflictDoNothing()
        .returning({ id: lifecycleEmailLog.id });
      if (!claimed) continue;

      try {
        await sendTrialGraceEmail(
          owner.email,
          {
            stage,
            organizationId: org.id,
            organizationName: org.name,
            trialEndedAt: grace.trialEndedAt,
            endsAt: grace.endsAt,
            sites: siteTraffic,
            now,
          },
          `trial-grace:${owner.userId}:${emailKey}`
        );
        this.logger.info({ organizationId: org.id, userId: owner.userId, stage }, "Sent trial grace email");
      } catch (error) {
        if (isIdempotencyConflict(error)) {
          this.logger.info({ organizationId: org.id, userId: owner.userId, stage }, "Trial grace email already sent");
          continue;
        }
        await db.delete(lifecycleEmailLog).where(eq(lifecycleEmailLog.id, claimed.id));
        this.logger.error(
          { err: error, organizationId: org.id, userId: owner.userId, stage },
          "Error sending trial grace email"
        );
      }
    }
  }
}

export const trialGraceEmails = new TrialGraceEmails();
