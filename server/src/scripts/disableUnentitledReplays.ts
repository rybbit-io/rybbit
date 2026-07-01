// Lists — and with --apply, disables — session replay for sites whose organization's
// plan does not include it (e.g. replay was enabled on Pro, then the org downgraded).
// Uses the same entitlement rule as the usage cron and the site-config API
// (subscriptionIncludesReplay), so the cleanup matches live enforcement exactly.
//
// Orgs whose Stripe price ID is missing from const.ts resolve to "Unknown Plan" and
// CANNOT be classified — they are listed for manual review and never auto-disabled.
//
// Usage:
//   tsc && node dist/scripts/disableUnentitledReplays.js            # verify only, no writes
//   tsc && node dist/scripts/disableUnentitledReplays.js --apply    # set sessionReplay = false

import { eq, inArray } from "drizzle-orm";
import { db } from "../db/postgres/postgres.js";
import { organization, sites } from "../db/postgres/schema.js";
import { stripe } from "../lib/stripe.js";
import {
  getAllStripeSubscriptionsByCustomer,
  getBestSubscriptionFromStripeSub,
  stripeSubscriptionInfoFromSnapshot,
  subscriptionIncludesReplay,
} from "../lib/subscriptionUtils.js";

const apply = process.argv.includes("--apply");

// How many orgs to resolve at once. Each org costs 2-3 sequential Postgres round-trips
// (custom plan, override, possibly AppSumo), which is painfully slow one-org-at-a-time
// over a tunnel to a remote database.
const CONCURRENCY = 10;

const startTime = Date.now();
function log(message: string) {
  console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ${message}`);
}

if (!stripe) {
  // Without Stripe credentials every Stripe-billed org resolves to free tier and
  // would be wrongly flagged — refuse to do anything rather than produce a bad list.
  console.error("STRIPE_SECRET_KEY is not set; refusing to run.");
  process.exit(1);
}

log("Querying sites with session replay enabled...");
const replaySites = await db
  .select({
    siteId: sites.siteId,
    domain: sites.domain,
    organizationId: sites.organizationId,
  })
  .from(sites)
  .where(eq(sites.sessionReplay, true));

log(`${replaySites.length} sites have session replay enabled.`);
if (replaySites.length === 0) {
  process.exit(0);
}

const orgIds = [...new Set(replaySites.map(s => s.organizationId).filter((id): id is string => id !== null))];
log(`Loading ${orgIds.length} organizations...`);
const orgs = orgIds.length
  ? await db
      .select({ id: organization.id, name: organization.name, stripeCustomerId: organization.stripeCustomerId })
      .from(organization)
      .where(inArray(organization.id, orgIds))
  : [];
const orgById = new Map(orgs.map(o => [o.id, o]));

log("Fetching all Stripe subscriptions (paginated, 100/request — may take a while on large accounts)...");
const stripeSnapshot = await getAllStripeSubscriptionsByCustomer();
log(`Stripe snapshot loaded: subscriptions for ${stripeSnapshot.size} customers.`);

type FlaggedSite = { siteId: number; domain: string | null; org: string; plan: string };

const toDisable: FlaggedSite[] = [];
const needsReview: FlaggedSite[] = [];
let entitledOrgs = 0;

log(`Resolving plan entitlement for ${orgIds.length} organizations (concurrency ${CONCURRENCY})...`);
for (let i = 0; i < orgIds.length; i += CONCURRENCY) {
  const chunk = orgIds.slice(i, i + CONCURRENCY);
  await Promise.all(
    chunk.map(async orgId => {
      const org = orgById.get(orgId);
      const stripeSub = stripeSubscriptionInfoFromSnapshot(stripeSnapshot, org?.stripeCustomerId ?? null);
      const subscription = await getBestSubscriptionFromStripeSub(orgId, stripeSub);

      // A Stripe price ID missing from const.ts resolves to "Unknown Plan" — we can't
      // tell whether it's pro, so park it for manual review instead of disabling.
      const isUnknownPlan = subscription.source === "stripe" && subscription.planName === "Unknown Plan";

      if (!isUnknownPlan && subscriptionIncludesReplay(subscription)) {
        entitledOrgs++;
        return;
      }

      const orgSites = replaySites.filter(s => s.organizationId === orgId);
      const plan = `${subscription.planName} (${subscription.source}, ${subscription.status})${
        isUnknownPlan ? ` priceId=${subscription.priceId}` : ""
      }`;
      const target = isUnknownPlan ? needsReview : toDisable;
      for (const site of orgSites) {
        target.push({ siteId: site.siteId, domain: site.domain, org: org?.name ?? orgId, plan });
      }
      log(
        `  ${isUnknownPlan ? "REVIEW" : "FLAGGED"}: ${org?.name ?? orgId} — ${plan} — ${orgSites.length} site(s)`
      );
    })
  );
  log(`  ${Math.min(i + CONCURRENCY, orgIds.length)}/${orgIds.length} orgs resolved`);
}

// Sites with no organization have no plan at all, so they can't be entitled
for (const site of replaySites.filter(s => s.organizationId === null)) {
  toDisable.push({ siteId: site.siteId, domain: site.domain, org: "(no organization)", plan: "(none)" });
}

log(
  `Done resolving: ${entitledOrgs} orgs entitled, ${toDisable.length} sites to disable, ${needsReview.length} sites need manual review.`
);

if (needsReview.length > 0) {
  console.log("\nNeeds manual review (Stripe price ID not in const.ts — add it to STRIPE_PRICES, these are NOT disabled):");
  console.table(needsReview);
}

if (toDisable.length === 0) {
  log("No sites to disable. Nothing to do.");
  process.exit(0);
}

console.log("\nSites with replay enabled but no plan access:");
console.table(toDisable);

const siteIds = toDisable.map(s => s.siteId);

if (!apply) {
  console.log("\nDry run — no changes made. Re-run with --apply to disable, or do it manually:");
  console.log(`UPDATE sites SET "sessionReplay" = false WHERE site_id IN (${siteIds.join(", ")});`);
  process.exit(0);
}

log(`Disabling session replay for ${siteIds.length} sites...`);
await db
  .update(sites)
  .set({ sessionReplay: false, updatedAt: new Date().toISOString() })
  .where(inArray(sites.siteId, siteIds));

log(`Disabled session replay for ${siteIds.length} sites.`);
process.exit(0);
