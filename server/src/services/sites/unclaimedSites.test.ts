import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ isCloud: false }));
const mocks = vi.hoisted(() => ({
  getSubscriptionInner: vi.fn(),
  invalidate: vi.fn(),
  clickhouseCommand: vi.fn(async () => undefined),
  detectPlatform: vi.fn(async () => null),
}));
vi.mock("../../db/postgres/postgres.js", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("../../db/postgres/schema.js");
  const client = new PGlite();
  return { db: drizzle(client, { schema }), sql: client };
});
vi.mock("../../db/clickhouse/clickhouse.js", () => ({ clickhouse: { command: mocks.clickhouseCommand } }));
vi.mock("../../lib/siteConfig.js", () => ({ siteConfig: { invalidate: mocks.invalidate } }));
vi.mock("../../api/stripe/getSubscription.js", () => ({ getSubscriptionInner: mocks.getSubscriptionInner }));
vi.mock("../lifecycleEmails/platformDetect.js", () => ({ detectPlatform: mocks.detectPlatform }));
vi.mock("../../lib/const.js", async importOriginal => ({
  ...(await importOriginal<typeof import("../../lib/const.js")>()),
  get IS_CLOUD() {
    return state.isCloud;
  },
}));

import { db, sql as client } from "../../db/postgres/postgres.js";
import { sites } from "../../db/postgres/schema.js";
import { claimExpiryIso } from "./claimExpiry.js";
import { siteConfigurationLifecycle as lifecycle, UNCLAIMED_SITE_TTL_MS } from "./siteConfigurationLifecycle.js";
import { unclaimedSiteCleanupService as cleanup } from "./unclaimedSiteCleanupService.js";

// Test-only DDL in an in-memory database. No application migrations/connections.
beforeAll(async () => {
  await (client as any).exec(`
CREATE TABLE organization (id text PRIMARY KEY);
INSERT INTO organization VALUES ('org_1'), ('org_2');
CREATE TABLE sites (
  "id" text,
  "site_id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "type" text,
  "domain" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  "created_by" text,
  "organization_id" text,
  "public" boolean DEFAULT false,
  "embed_enabled" boolean DEFAULT false,
  "saltUserIds" boolean DEFAULT false,
  "blockBots" boolean NOT NULL DEFAULT true,
  "first_party_proxy" boolean DEFAULT false,
  "excluded_ips" jsonb DEFAULT '[]'::jsonb,
  "excluded_countries" jsonb DEFAULT '[]'::jsonb,
  "excluded_paths" jsonb DEFAULT '[]'::jsonb,
  "excluded_hostnames" jsonb DEFAULT '[]'::jsonb,
  "excluded_user_agents" jsonb DEFAULT '[]'::jsonb,
  "excluded_asns" jsonb DEFAULT '[]'::jsonb,
  "excluded_query_params" jsonb DEFAULT '[]'::jsonb,
  "sessionReplay" boolean DEFAULT false,
  "webVitals" boolean DEFAULT false,
  "trackErrors" boolean DEFAULT false,
  "trackOutbound" boolean DEFAULT true,
  "trackUrlParams" boolean DEFAULT true,
  "trackInitialPageView" boolean DEFAULT true,
  "trackSpaNavigation" boolean DEFAULT true,
  "trackIp" boolean DEFAULT false,
  "trackButtonClicks" boolean DEFAULT false,
  "trackCopy" boolean DEFAULT false,
  "trackFormInteractions" boolean DEFAULT false,
  "api_key" text,
  "private_link_key" text,
  "tags" jsonb DEFAULT '[]'::jsonb,
  "detected_platform" text,
  "claim_expires_at" timestamp
);
`);
});
afterAll(async () => {
  await (client as any).close();
});
beforeEach(async () => {
  vi.clearAllMocks();
  state.isCloud = false;
  mocks.getSubscriptionInner.mockResolvedValue({ siteLimit: 1 });
  await (client as any).exec("TRUNCATE sites RESTART IDENTITY");
});

async function unclaimed() {
  return lifecycle.createUnclaimed({ domain: "acme.dev" });
}
function claimInput(site: { siteId: number; privateLinkKey: string | null }, organizationId = "org_1") {
  return { siteId: site.siteId, privateLinkKey: site.privateLinkKey!, organizationId, userId: "user_1" };
}
async function readSite(siteId: number) {
  return db.query.sites.findFirst({ where: eq(sites.siteId, siteId) });
}

it("creates a private org-less site with a UTC 24-hour expiry and no outbound fetch", async () => {
  const start = Date.now();
  const site = await lifecycle.createUnclaimed({ domain: " HTTPS://www.Acme.dev/pricing?x=1 " });
  expect(site).toMatchObject({
    domain: "acme.dev",
    name: "acme.dev",
    organizationId: null,
    createdBy: null,
    public: false,
    sessionReplay: false,
  });
  expect(site.privateLinkKey).toMatch(/^[a-f0-9]{12}$/);
  expect(Date.parse(claimExpiryIso(site.claimExpiresAt)!)).toBeGreaterThanOrEqual(start + UNCLAIMED_SITE_TTL_MS);
  expect(mocks.detectPlatform).not.toHaveBeenCalled();
});
it("rejects invalid domains without inserting a site", async () => {
  await expect(lifecycle.createUnclaimed({ domain: "not a domain" })).rejects.toMatchObject({
    code: "invalid_web_domain",
    statusCode: 400,
  });
  expect(await db.select().from(sites)).toEqual([]);
});
it("interprets timezone-less Postgres expiries as UTC", () => {
  expect(claimExpiryIso("2026-09-12 12:30:00")).toBe("2026-09-12T12:30:00.000Z");
});

describe("claim", () => {
  it("moves the site and revokes the anonymous credential", async () => {
    const site = await unclaimed();
    await lifecycle.claim(claimInput(site));
    expect(await readSite(site.siteId)).toMatchObject({
      organizationId: "org_1",
      createdBy: "user_1",
      privateLinkKey: null,
      claimExpiresAt: null,
    });
    expect(mocks.invalidate).toHaveBeenCalledWith(expect.objectContaining({ siteId: site.siteId }));
  });
  it("rejects a wrong key and a second claim", async () => {
    const site = await unclaimed();
    await expect(lifecycle.claim({ ...claimInput(site), privateLinkKey: "wrong" })).rejects.toMatchObject({
      statusCode: 403,
    });
    await lifecycle.claim(claimInput(site));
    await expect(lifecycle.claim(claimInput(site, "org_2"))).rejects.toMatchObject({ statusCode: 409 });
    expect((await readSite(site.siteId))?.organizationId).toBe("org_1");
  });
  it("rejects expired sites", async () => {
    const site = await unclaimed();
    await db.update(sites).set({ claimExpiresAt: "2000-01-01T00:00:00.000Z" }).where(eq(sites.siteId, site.siteId));
    await expect(lifecycle.claim(claimInput(site))).rejects.toMatchObject({ statusCode: 410 });
  });
  it("allows only one of two concurrent claims to different organizations", async () => {
    const site = await unclaimed();
    const results = await Promise.allSettled([
      lifecycle.claim(claimInput(site)),
      lifecycle.claim(claimInput(site, "org_2")),
    ]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
  });
  it("does not oversubscribe an organization through concurrent claims", async () => {
    state.isCloud = true;
    const first = await unclaimed();
    const second = await unclaimed();
    const results = await Promise.allSettled([lifecycle.claim(claimInput(first)), lifecycle.claim(claimInput(second))]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.select().from(sites).where(eq(sites.organizationId, "org_1"))).toHaveLength(1);
  });
  it("shares the capacity lock with normal site creation", async () => {
    state.isCloud = true;
    const site = await unclaimed();
    const results = await Promise.allSettled([
      lifecycle.claim(claimInput(site)),
      lifecycle.create({ organizationId: "org_1", domain: "other.dev", name: "Other" }),
    ]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.select().from(sites).where(eq(sites.organizationId, "org_1"))).toHaveLength(1);
  });
  it("allows unlimited plans and self-hosted organizations", async () => {
    state.isCloud = true;
    mocks.getSubscriptionInner.mockResolvedValue({ siteLimit: null });
    await lifecycle.claim(claimInput(await unclaimed()));
    await lifecycle.claim(claimInput(await unclaimed()));
    expect(await db.select().from(sites).where(eq(sites.organizationId, "org_1"))).toHaveLength(2);
  });
});

describe("cleanup", () => {
  it("deletes only expired unclaimed sites, keeping legacy org-less and claimed sites", async () => {
    const expired = await unclaimed();
    const fresh = await unclaimed();
    const legacy = await unclaimed();
    const claimed = await unclaimed();
    await db.update(sites).set({ claimExpiresAt: "2000-01-01T00:00:00Z" }).where(eq(sites.siteId, expired.siteId));
    await db.update(sites).set({ claimExpiresAt: null }).where(eq(sites.siteId, legacy.siteId));
    await lifecycle.claim(claimInput(claimed));
    expect(await cleanup.deleteExpiredSites()).toBe(1);
    expect(await readSite(expired.siteId)).toBeUndefined();
    expect(await readSite(fresh.siteId)).toBeDefined();
    expect(await readSite(legacy.siteId)).toBeDefined();
    expect(await readSite(claimed.siteId)).toBeDefined();
    expect(mocks.clickhouseCommand).toHaveBeenCalledTimes(2);
  });
  it("rechecks a stale candidate before deletion and side effects", async () => {
    const site = await unclaimed();
    await lifecycle.claim(claimInput(site));
    expect(await lifecycle.deleteExpired(site.siteId, "2100-01-01T00:00:00Z")).toBe(false);
    expect(await readSite(site.siteId)).toBeDefined();
    expect(mocks.clickhouseCommand).not.toHaveBeenCalled();
  });
  it("keeps the row for retry if replay cleanup fails", async () => {
    const site = await unclaimed();
    await db.update(sites).set({ claimExpiresAt: "2000-01-01T00:00:00Z" }).where(eq(sites.siteId, site.siteId));
    mocks.clickhouseCommand.mockRejectedValueOnce(new Error("ClickHouse unavailable"));
    expect(await cleanup.deleteExpiredSites()).toBe(0);
    expect(await readSite(site.siteId)).toBeDefined();
    expect(await cleanup.deleteExpiredSites()).toBe(1);
  });
  it("does nothing when there are no expired sites", async () => {
    expect(await cleanup.deleteExpiredSites()).toBe(0);
    expect(mocks.clickhouseCommand).not.toHaveBeenCalled();
  });
});
