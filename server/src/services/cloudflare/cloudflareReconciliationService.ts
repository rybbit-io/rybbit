import { and, eq, inArray, isNotNull } from "drizzle-orm";
import * as cron from "node-cron";
import { db } from "../../db/postgres/postgres.js";
import { organization, sites } from "../../db/postgres/schema.js";
import {
  deleteCustomHostname,
  isCloudflareConfigured,
  listCustomHostnames,
} from "../../lib/cloudflare.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { removeProxyDomain } from "../../lib/proxyDomains.js";

/**
 * Daily safety net that guarantees we stop paying for managed-proxy custom hostnames.
 *
 * Inline teardown (on site delete, proxy disable, or churn) is best-effort and can fail
 * silently — Cloudflare unreachable, a process crash mid-flow, or a code path that never
 * runs our TypeScript (an org deleted at the DB level orphans its site rows). This sweep
 * is what actually converges: it lists every hostname in Cloudflare and deletes the ones
 * no live site backs.
 *
 * Liveness predicate: a hostname is kept iff an enabled proxy site still references it
 * AND that site has a surviving organization. That single rule closes site-delete,
 * proxy-disable, and org-delete/orphan in one place. Plan-based churn teardown is handled
 * eagerly by the Stripe webhook (see teardownProxiesForStripeCustomer).
 */
class CloudflareReconciliationService {
  private task: cron.ScheduledTask | null = null;
  private logger = createServiceLogger("cf-reconciliation");

  // If a single run would delete more than this, something is likely wrong (a DB blip
  // returning a tiny live set). Abort rather than mass-delete real customers' hostnames.
  private readonly MAX_DELETES_PER_RUN = 100;

  private initCron() {
    // Run wherever managed proxy is operable — the safety net should protect any
    // deployment that creates Cloudflare hostnames, not just cloud.
    if (!isCloudflareConfigured) return;

    this.task = cron.schedule(
      "0 2 * * *",
      async () => {
        try {
          await this.reconcile();
        } catch (error) {
          this.logger.error(error as Error, "Error during Cloudflare hostname reconciliation");
        }
      },
      { timezone: "UTC" }
    );

    this.logger.info("Cloudflare hostname reconciliation cron initialized (runs daily at 02:00 UTC)");
  }

  /**
   * The set of hostnames that SHOULD exist in Cloudflare. Returns null on DB failure —
   * callers MUST treat null as "abort", never as "nothing is live" (which would delete
   * every customer's hostname).
   */
  private async getLiveProxyHostnames(): Promise<Set<string> | null> {
    try {
      const rows = await db
        .select({ proxyDomain: sites.proxyDomain })
        .from(sites)
        .innerJoin(organization, eq(sites.organizationId, organization.id))
        .where(and(eq(sites.proxyEnabled, true), isNotNull(sites.proxyDomain)));

      const live = new Set<string>();
      for (const row of rows) {
        if (row.proxyDomain) live.add(row.proxyDomain.toLowerCase());
      }
      return live;
    } catch (error) {
      this.logger.error(error as Error, "Failed to load live proxy hostnames; aborting reconciliation");
      return null;
    }
  }

  public async reconcile(): Promise<void> {
    if (!isCloudflareConfigured) return;
    this.logger.info("Starting Cloudflare custom hostname reconciliation...");

    const live = await this.getLiveProxyHostnames();
    if (live === null) return; // DB failure — never delete on incomplete knowledge.

    let cfHostnames;
    try {
      cfHostnames = await listCustomHostnames();
    } catch (error) {
      this.logger.error(error as Error, "Failed to list Cloudflare custom hostnames; aborting reconciliation");
      return;
    }

    const orphans = cfHostnames.filter(ch => !live.has(ch.hostname.toLowerCase()));

    // Defensive guard: an empty live set against a populated zone almost certainly means
    // a bad read, not that every customer churned at once. Refuse to wipe the zone.
    if (live.size === 0 && cfHostnames.length > this.MAX_DELETES_PER_RUN) {
      this.logger.error(
        `Reconciliation found 0 live hostnames but ${cfHostnames.length} in Cloudflare — aborting as a safety measure.`
      );
      return;
    }

    if (orphans.length > this.MAX_DELETES_PER_RUN) {
      this.logger.error(
        `Reconciliation wants to delete ${orphans.length} hostnames (> cap ${this.MAX_DELETES_PER_RUN}) — aborting. Investigate before re-running.`
      );
      return;
    }

    let deleted = 0;
    for (const orphan of orphans) {
      try {
        await deleteCustomHostname(orphan.id);
        removeProxyDomain(orphan.hostname);
        deleted++;
      } catch (error) {
        this.logger.error(error as Error, `Failed to delete orphaned hostname ${orphan.hostname} (${orphan.id})`);
      }
    }

    this.logger.info(
      `Cloudflare reconciliation complete: ${cfHostnames.length} in Cloudflare, ${live.size} live, ${deleted} orphan(s) deleted.`
    );
  }

  public start() {
    this.initCron();
  }

  public stop() {
    if (this.task) {
      this.task.stop();
      this.logger.info("Cloudflare reconciliation cron stopped");
    }
  }
}

export const cloudflareReconciliationService = new CloudflareReconciliationService();

/**
 * Tear down every managed-proxy hostname owned by a churned Stripe customer's
 * organization(s), so we stop paying the moment they cancel. Best-effort: failures are
 * logged and swept up by the daily reconcile. Treats managed proxy as a paid feature —
 * if you offer it on the free tier, drop the call site in the Stripe webhook.
 */
export async function teardownProxiesForStripeCustomer(stripeCustomerId: string): Promise<void> {
  if (!isCloudflareConfigured) return;
  const logger = createServiceLogger("managed-proxy");

  try {
    const orgs = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.stripeCustomerId, stripeCustomerId));
    if (orgs.length === 0) return;

    const orgIds = orgs.map(o => o.id);
    const proxied = await db
      .select({
        siteId: sites.siteId,
        proxyDomain: sites.proxyDomain,
        proxyCfHostnameId: sites.proxyCfHostnameId,
      })
      .from(sites)
      .where(and(inArray(sites.organizationId, orgIds), isNotNull(sites.proxyCfHostnameId)));

    for (const site of proxied) {
      try {
        if (site.proxyCfHostnameId) {
          await deleteCustomHostname(site.proxyCfHostnameId);
        }
        await db
          .update(sites)
          .set({ proxyDomain: null, proxyEnabled: false, proxyStatus: null, proxyCfHostnameId: null })
          .where(eq(sites.siteId, site.siteId));
        if (site.proxyDomain) removeProxyDomain(site.proxyDomain);
      } catch (error) {
        logger.error(error as Error, `Failed to tear down proxy for site ${site.siteId} on churn`);
      }
    }

    if (proxied.length > 0) {
      logger.info(`Tore down ${proxied.length} managed proxy hostname(s) for churned customer ${stripeCustomerId}`);
    }
  } catch (error) {
    logger.error(error as Error, `Failed to tear down proxies for Stripe customer ${stripeCustomerId}`);
  }
}
