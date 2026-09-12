import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  isCloud: false,
  site: null as Record<string, unknown> | null,
  insertedValues: [] as Record<string, unknown>[],
  updatedValues: [] as Record<string, unknown>[],
  selectedRows: [] as Record<string, unknown>[],
  deletedIds: [] as number[],
}));

const mocks = vi.hoisted(() => ({
  getSubscriptionInner: vi.fn(),
  invalidate: vi.fn(),
  clickhouseCommand: vi.fn(async () => undefined),
}));

vi.mock("../../db/postgres/postgres.js", () => ({
  db: {
    query: { sites: { findFirst: async () => state.site } },
    select: () => ({ from: () => ({ where: async () => state.selectedRows }) }),
    insert: () => ({
      values: (values: Record<string, unknown>) => ({
        returning: async () => {
          state.insertedValues.push(values);
          return [{ siteId: 7, ...values }];
        },
      }),
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: () => ({
          returning: async () => {
            state.updatedValues.push(values);
            return [{ ...(state.site ?? {}), ...values }];
          },
        }),
      }),
    }),
    delete: () => ({
      where: async () => {
        if (state.site) state.deletedIds.push(state.site.siteId as number);
      },
    }),
  },
}));

vi.mock("../../db/clickhouse/clickhouse.js", () => ({ clickhouse: { command: mocks.clickhouseCommand } }));
vi.mock("../../lib/siteConfig.js", () => ({ siteConfig: { invalidate: mocks.invalidate } }));
vi.mock("../../api/stripe/getSubscription.js", () => ({ getSubscriptionInner: mocks.getSubscriptionInner }));
vi.mock("../lifecycleEmails/platformDetect.js", () => ({ detectPlatform: async () => null }));
vi.mock("../../lib/const.js", async importOriginal => {
  const actual = await importOriginal<typeof import("../../lib/const.js")>();
  return {
    ...actual,
    get IS_CLOUD() {
      return state.isCloud;
    },
  };
});

import { SiteLifecycleError, UNCLAIMED_SITE_TTL_MS, siteConfigurationLifecycle } from "./siteConfigurationLifecycle.js";
import { unclaimedSiteCleanupService } from "./unclaimedSiteCleanupService.js";

function unclaimedSite(overrides: Record<string, unknown> = {}) {
  return {
    id: "abc123",
    siteId: 7,
    domain: "acme.dev",
    organizationId: null,
    privateLinkKey: "aaaaaaaaaaaa",
    claimExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

async function expectLifecycleError(promise: Promise<unknown>, code: string, statusCode: number) {
  await expect(promise).rejects.toMatchObject({ code, statusCode });
  await expect(promise).rejects.toBeInstanceOf(SiteLifecycleError);
}

beforeEach(() => {
  state.isCloud = false;
  state.site = null;
  state.insertedValues = [];
  state.updatedValues = [];
  state.selectedRows = [];
  state.deletedIds = [];
  vi.clearAllMocks();
});

describe("createUnclaimed", () => {
  it("creates an owner-less site with a private link key and a 1-day expiry", async () => {
    const before = Date.now();
    const site = await siteConfigurationLifecycle.createUnclaimed({ domain: "https://www.Acme.dev/pricing?x=1" });

    expect(site.domain).toBe("acme.dev");
    expect(site.name).toBe("acme.dev");
    expect(site.organizationId).toBeNull();
    expect(site.createdBy).toBeNull();
    expect(site.privateLinkKey).toMatch(/^[a-f0-9]{12}$/);

    const expires = new Date(site.claimExpiresAt as string).getTime();
    expect(expires - before).toBeGreaterThanOrEqual(UNCLAIMED_SITE_TTL_MS - 1000);
    expect(expires - before).toBeLessThanOrEqual(UNCLAIMED_SITE_TTL_MS + 1000);
  });

  it("rejects an invalid domain", async () => {
    await expectLifecycleError(siteConfigurationLifecycle.createUnclaimed({ domain: "not a domain" }), "invalid_web_domain", 400);
    expect(state.insertedValues).toHaveLength(0);
  });
});

describe("claim", () => {
  const input = { siteId: 7, privateLinkKey: "aaaaaaaaaaaa", organizationId: "org_1", userId: "user_1" };

  it("re-parents the site, clears the expiry and the anonymous key", async () => {
    state.site = unclaimedSite();

    const claimed = await siteConfigurationLifecycle.claim(input);

    expect(state.updatedValues[0]).toMatchObject({
      organizationId: "org_1",
      createdBy: "user_1",
      claimExpiresAt: null,
      privateLinkKey: null,
    });
    expect(claimed.organizationId).toBe("org_1");
    expect(mocks.invalidate).toHaveBeenCalledWith(expect.objectContaining({ siteId: 7 }));
  });

  it("refuses a site that already has an organization", async () => {
    state.site = unclaimedSite({ organizationId: "org_other", claimExpiresAt: null });
    await expectLifecycleError(siteConfigurationLifecycle.claim(input), "site_already_claimed", 409);
    expect(state.updatedValues).toHaveLength(0);
  });

  it("refuses the wrong private link key", async () => {
    state.site = unclaimedSite();
    await expectLifecycleError(
      siteConfigurationLifecycle.claim({ ...input, privateLinkKey: "bbbbbbbbbbbb" }),
      "invalid_claim_key",
      403
    );
    expect(state.updatedValues).toHaveLength(0);
  });

  it("refuses an expired site", async () => {
    state.site = unclaimedSite({ claimExpiresAt: new Date(Date.now() - 1000).toISOString() });
    await expectLifecycleError(siteConfigurationLifecycle.claim(input), "site_expired", 410);
    expect(state.updatedValues).toHaveLength(0);
  });

  it("enforces the organization's site limit on cloud", async () => {
    state.isCloud = true;
    state.site = unclaimedSite();
    state.selectedRows = [{ siteId: 1 }];
    mocks.getSubscriptionInner.mockResolvedValue({ siteLimit: 1 });

    await expectLifecycleError(siteConfigurationLifecycle.claim(input), "site_limit_reached", 403);
    expect(state.updatedValues).toHaveLength(0);
  });
});

describe("unclaimedSiteCleanupService", () => {
  it("deletes every expired unclaimed site the query returns", async () => {
    state.selectedRows = [{ siteId: 7, domain: "acme.dev" }];
    state.site = unclaimedSite({ claimExpiresAt: new Date(Date.now() - 1000).toISOString() });

    const deleted = await unclaimedSiteCleanupService.deleteExpiredSites();

    expect(deleted).toBe(1);
    expect(state.deletedIds).toEqual([7]);
    expect(mocks.invalidate).toHaveBeenCalledWith(expect.objectContaining({ siteId: 7 }));
  });

  it("is a no-op when nothing has expired", async () => {
    const deleted = await unclaimedSiteCleanupService.deleteExpiredSites();
    expect(deleted).toBe(0);
    expect(state.deletedIds).toEqual([]);
  });
});
