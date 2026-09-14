import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SubscriptionInfo } from "../lib/subscriptionUtils.js";

/**
 * The usage cron is the quota gate: it decides which sites stop ingesting (over the
 * monthly event limit) and which stop recording replays (plan or quota exhausted), and
 * which owners get warned. Everything it reads — ClickHouse counts, Postgres orgs/sites,
 * Stripe subscriptions — is mocked; the thresholds and the set bookkeeping are the
 * subject under test.
 */
const state = vi.hoisted(() => ({
  sites: [] as Array<{ siteId: number; organizationId: string | null }>,
  organizations: [] as Array<{
    id: string;
    name: string;
    stripeCustomerId: string | null;
    createdAt: string;
    overMonthlyLimit: boolean | null;
    approachingLimitNotifiedPeriodStart: string | null;
  }>,
  owners: [] as Array<{ email: string }>,
  eventCounts: [] as Array<{ site_id: number; count: string }>,
  replayCounts: [] as Array<{ site_id: number; count: string }>,
  /** organizationId -> subscription the resolver should return (or an Error to throw). */
  subscriptions: new Map<string, SubscriptionInfo | Error>(),
  /** Every organization update the run performed, in order. */
  updates: [] as Array<Record<string, unknown>>,
  clickhouseError: null as Error | null,
}));

const mocks = vi.hoisted(() => ({
  getAllStripeSubscriptionsByCustomer: vi.fn(),
  sendLimitExceededEmail: vi.fn(),
  sendApproachingLimitEmail: vi.fn(),
}));

vi.mock("../db/postgres/postgres.js", () => {
  function chain(rows: () => unknown[]) {
    const builder: any = {
      from: () => builder,
      innerJoin: () => builder,
      where: () => builder,
      then: (resolve: any, reject: any) => Promise.resolve(rows()).then(resolve, reject),
    };
    return builder;
  }

  return {
    db: {
      // The three reads are told apart by the columns each one selects.
      select: (fields: Record<string, unknown>) =>
        chain(() => {
          if ("email" in fields) return state.owners;
          if ("siteId" in fields) return state.sites;
          return state.organizations;
        }),
      update: () => ({
        set: (values: Record<string, unknown>) => ({
          where: async () => {
            state.updates.push(values);
          },
        }),
      }),
    },
  };
});

vi.mock("../db/clickhouse/clickhouse.js", () => ({
  clickhouse: {
    query: async ({ query }: { query: string }) => {
      if (state.clickhouseError) {
        throw state.clickhouseError;
      }
      return { kind: query.includes("session_replay_metadata") ? "replays" : "events" };
    },
  },
}));

vi.mock("../api/analytics/utils/utils.js", () => ({
  processResults: async (result: { kind: string }) =>
    result.kind === "replays" ? state.replayCounts : state.eventCounts,
}));

vi.mock("../lib/email/email.js", () => ({
  sendLimitExceededEmail: mocks.sendLimitExceededEmail,
  sendApproachingLimitEmail: mocks.sendApproachingLimitEmail,
}));

vi.mock("../lib/logger/logger.js", () => ({
  createServiceLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Only the Stripe-touching resolvers are stubbed; subscriptionIncludesReplay and
// getReplayLimit stay real so the replay gate is exercised, not re-specified.
vi.mock("../lib/subscriptionUtils.js", async importOriginal => {
  const actual = await importOriginal<typeof import("../lib/subscriptionUtils.js")>();
  return {
    ...actual,
    getAllStripeSubscriptionsByCustomer: mocks.getAllStripeSubscriptionsByCustomer,
    stripeSubscriptionInfoFromSnapshot: () => null,
    getBestSubscriptionFromStripeSub: async (organizationId: string) => {
      const subscription = state.subscriptions.get(organizationId);
      if (subscription instanceof Error) {
        throw subscription;
      }
      return subscription ?? freeSub();
    },
  };
});

vi.mock("../lib/stripe.js", () => ({ stripe: null }));

import { usageService } from "./usageService.js";

function freeSub(): SubscriptionInfo {
  return {
    source: "free",
    eventLimit: 3_000,
    periodStart: "2026-08-01",
    planName: "free",
    status: "free",
  };
}

function stripeSub(overrides: Partial<Extract<SubscriptionInfo, { source: "stripe" }>> = {}): SubscriptionInfo {
  return {
    source: "stripe",
    subscriptionId: "sub_1",
    priceId: "price_1",
    planName: "pro500k",
    eventLimit: 100_000,
    replayLimit: 1_000,
    periodStart: "2026-08-01",
    currentPeriodEnd: new Date("2026-09-01T00:00:00Z"),
    status: "active",
    interval: "month",
    cancelAtPeriodEnd: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function org(
  id: string,
  overrides: Partial<{
    name: string;
    stripeCustomerId: string | null;
    overMonthlyLimit: boolean | null;
    approachingLimitNotifiedPeriodStart: string | null;
  }> = {}
) {
  return {
    id,
    name: `Org ${id}`,
    stripeCustomerId: "cus_1",
    createdAt: "2026-01-01",
    overMonthlyLimit: false,
    approachingLimitNotifiedPeriodStart: null,
    ...overrides,
  };
}

/** One org, one site, with the given subscription and monthly event count. */
function singleOrg(options: {
  subscription?: SubscriptionInfo;
  eventCount?: number;
  replayCount?: number;
  orgOverrides?: Parameters<typeof org>[1];
}) {
  state.organizations = [org("org_1", options.orgOverrides)];
  state.sites = [{ siteId: 1, organizationId: "org_1" }];
  state.subscriptions.set("org_1", options.subscription ?? stripeSub());
  state.eventCounts = [{ site_id: 1, count: String(options.eventCount ?? 0) }];
  state.replayCounts = [{ site_id: 1, count: String(options.replayCount ?? 0) }];
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 7, 3, 12, 0, 0));

  state.sites = [];
  state.organizations = [];
  state.owners = [{ email: "owner@example.com" }];
  state.eventCounts = [];
  state.replayCounts = [];
  state.subscriptions.clear();
  state.updates.length = 0;
  state.clickhouseError = null;

  mocks.getAllStripeSubscriptionsByCustomer.mockReset();
  mocks.getAllStripeSubscriptionsByCustomer.mockResolvedValue(new Map());
  mocks.sendLimitExceededEmail.mockReset();
  mocks.sendLimitExceededEmail.mockResolvedValue(undefined);
  mocks.sendApproachingLimitEmail.mockReset();
  mocks.sendApproachingLimitEmail.mockResolvedValue(undefined);

  // The service is a singleton; clear the blocked sets between tests.
  usageService.setSitesOverLimit(new Set());
  usageService.setSitesWithoutReplay(new Set());
});

afterEach(() => {
  vi.useRealTimers();
});

describe("updateOrganizationsMonthlyUsage — Stripe outage", () => {
  it("skips the whole run rather than treating every paying org as free", async () => {
    singleOrg({ eventCount: 10_000_000 });
    mocks.getAllStripeSubscriptionsByCustomer.mockRejectedValue(new Error("stripe is down"));

    await usageService.updateOrganizationsMonthlyUsage();

    expect(state.updates).toEqual([]);
    expect(usageService.getSitesOverLimit().size).toBe(0);
    expect(mocks.sendLimitExceededEmail).not.toHaveBeenCalled();
  });

  it("leaves already-blocked sites blocked when the run is skipped", async () => {
    usageService.setSitesOverLimit(new Set([1]));
    singleOrg({ eventCount: 0 });
    mocks.getAllStripeSubscriptionsByCustomer.mockRejectedValue(new Error("stripe is down"));

    await usageService.updateOrganizationsMonthlyUsage();

    expect(usageService.isSiteOverLimit(1)).toBe(true);
  });
});

describe("updateOrganizationsMonthlyUsage — event limit boundary", () => {
  it("does not block an org sitting exactly on its limit", async () => {
    singleOrg({ subscription: stripeSub({ eventLimit: 100_000 }), eventCount: 100_000 });

    await usageService.updateOrganizationsMonthlyUsage();

    expect(state.updates[0]).toMatchObject({ monthlyEventCount: 100_000, overMonthlyLimit: false });
    expect(usageService.isSiteOverLimit(1)).toBe(false);
  });

  it("blocks an org one event past its limit", async () => {
    singleOrg({ subscription: stripeSub({ eventLimit: 100_000 }), eventCount: 100_001 });

    await usageService.updateOrganizationsMonthlyUsage();

    expect(state.updates[0]).toMatchObject({ overMonthlyLimit: true });
    expect(usageService.isSiteOverLimit(1)).toBe(true);
  });

  it("blocks every site of an over-limit org, counting their events together", async () => {
    state.organizations = [org("org_1")];
    state.sites = [
      { siteId: 1, organizationId: "org_1" },
      { siteId: 2, organizationId: "org_1" },
    ];
    state.subscriptions.set("org_1", stripeSub({ eventLimit: 100_000 }));
    state.eventCounts = [
      { site_id: 1, count: "60000" },
      { site_id: 2, count: "60000" },
    ];

    await usageService.updateOrganizationsMonthlyUsage();

    expect(state.updates[0]).toMatchObject({ monthlyEventCount: 120_000, overMonthlyLimit: true });
    expect([...usageService.getSitesOverLimit()].sort()).toEqual([1, 2]);
  });

  it("unblocks an org's sites once it drops back under the limit", async () => {
    usageService.setSitesOverLimit(new Set([1, 99]));
    singleOrg({ subscription: stripeSub({ eventLimit: 100_000 }), eventCount: 10 });

    await usageService.updateOrganizationsMonthlyUsage();

    expect(usageService.isSiteOverLimit(1)).toBe(false);
    // Sites belonging to no processed org are left untouched.
    expect(usageService.isSiteOverLimit(99)).toBe(true);
  });

  it("ignores sites with no organization", async () => {
    state.organizations = [org("org_1")];
    state.sites = [
      { siteId: 1, organizationId: null },
      { siteId: 2, organizationId: "org_1" },
    ];
    state.subscriptions.set("org_1", stripeSub({ eventLimit: 1_000 }));
    state.eventCounts = [
      { site_id: 1, count: "999999" },
      { site_id: 2, count: "500" },
    ];

    await usageService.updateOrganizationsMonthlyUsage();

    expect(state.updates[0]).toMatchObject({ monthlyEventCount: 500, overMonthlyLimit: false });
    expect(usageService.getSitesOverLimit().size).toBe(0);
  });

  it("fails open when ClickHouse cannot be queried", async () => {
    singleOrg({ subscription: stripeSub({ eventLimit: 1_000 }), eventCount: 10_000_000 });
    state.clickhouseError = new Error("clickhouse is down");

    await usageService.updateOrganizationsMonthlyUsage();

    expect(state.updates[0]).toMatchObject({ monthlyEventCount: 0, overMonthlyLimit: false });
    expect(usageService.getSitesOverLimit().size).toBe(0);
  });
});

describe("updateOrganizationsMonthlyUsage — limit exceeded email", () => {
  it("emails every owner on the transition from under to over limit", async () => {
    state.owners = [{ email: "a@example.com" }, { email: "b@example.com" }];
    singleOrg({ subscription: stripeSub({ eventLimit: 100 }), eventCount: 101 });

    await usageService.updateOrganizationsMonthlyUsage();

    expect(mocks.sendLimitExceededEmail).toHaveBeenCalledTimes(2);
    expect(mocks.sendLimitExceededEmail).toHaveBeenCalledWith("a@example.com", "Org org_1", 101, 100);
  });

  it("does not re-email an org that was already over its limit", async () => {
    singleOrg({
      subscription: stripeSub({ eventLimit: 100 }),
      eventCount: 5_000,
      orgOverrides: { overMonthlyLimit: true },
    });

    await usageService.updateOrganizationsMonthlyUsage();

    expect(mocks.sendLimitExceededEmail).not.toHaveBeenCalled();
    expect(state.updates[0]).toMatchObject({ overMonthlyLimit: true });
  });

  it("still blocks the sites when the org has no owner to email", async () => {
    state.owners = [];
    singleOrg({ subscription: stripeSub({ eventLimit: 100 }), eventCount: 101 });

    await usageService.updateOrganizationsMonthlyUsage();

    expect(mocks.sendLimitExceededEmail).not.toHaveBeenCalled();
    expect(usageService.isSiteOverLimit(1)).toBe(true);
  });

  it("keeps blocking sites when the email itself fails", async () => {
    mocks.sendLimitExceededEmail.mockRejectedValue(new Error("smtp down"));
    singleOrg({ subscription: stripeSub({ eventLimit: 100 }), eventCount: 101 });

    await usageService.updateOrganizationsMonthlyUsage();

    expect(usageService.isSiteOverLimit(1)).toBe(true);
  });
});

describe("updateOrganizationsMonthlyUsage — approaching limit email", () => {
  it("warns at 90% of the limit and records the period it warned for", async () => {
    singleOrg({ subscription: stripeSub({ eventLimit: 100_000 }), eventCount: 90_000 });

    await usageService.updateOrganizationsMonthlyUsage();

    expect(mocks.sendApproachingLimitEmail).toHaveBeenCalledWith("owner@example.com", "Org org_1", 90_000, 100_000);
    expect(state.updates[0]).toMatchObject({ approachingLimitNotifiedPeriodStart: "2026-08-01" });
  });

  it("stays quiet just below 90% early in the month", async () => {
    singleOrg({ subscription: stripeSub({ eventLimit: 100_000 }), eventCount: 89_999 });

    await usageService.updateOrganizationsMonthlyUsage();

    expect(mocks.sendApproachingLimitEmail).not.toHaveBeenCalled();
    expect(state.updates[0]).not.toHaveProperty("approachingLimitNotifiedPeriodStart");
  });

  it("warns on the run-rate projection once a week of the month has elapsed", async () => {
    // Day 15 of a 31-day month: 50k events project to ~107k, over the 100k limit,
    // while still being well under the 90% threshold.
    vi.setSystemTime(new Date(2026, 7, 15, 12, 0, 0));
    singleOrg({ subscription: stripeSub({ eventLimit: 100_000 }), eventCount: 50_000 });

    await usageService.updateOrganizationsMonthlyUsage();

    expect(mocks.sendApproachingLimitEmail).toHaveBeenCalledTimes(1);
  });

  it("does not project in the first week of the month", async () => {
    // Same run rate on day 3: the projection would fire, but it is not consulted yet.
    vi.setSystemTime(new Date(2026, 7, 3, 12, 0, 0));
    singleOrg({ subscription: stripeSub({ eventLimit: 100_000 }), eventCount: 10_000 });

    await usageService.updateOrganizationsMonthlyUsage();

    expect(mocks.sendApproachingLimitEmail).not.toHaveBeenCalled();
  });

  it("stays quiet in the last two days of the month, when a warning could not be acted on", async () => {
    vi.setSystemTime(new Date(2026, 7, 30, 12, 0, 0));
    singleOrg({ subscription: stripeSub({ eventLimit: 100_000 }), eventCount: 95_000 });

    await usageService.updateOrganizationsMonthlyUsage();

    expect(mocks.sendApproachingLimitEmail).not.toHaveBeenCalled();
  });

  it("does not warn twice in the same billing period", async () => {
    singleOrg({
      subscription: stripeSub({ eventLimit: 100_000 }),
      eventCount: 95_000,
      orgOverrides: { approachingLimitNotifiedPeriodStart: "2026-08-01" },
    });

    await usageService.updateOrganizationsMonthlyUsage();

    expect(mocks.sendApproachingLimitEmail).not.toHaveBeenCalled();
  });

  it("warns again in a new period after last month's warning", async () => {
    singleOrg({
      subscription: stripeSub({ eventLimit: 100_000 }),
      eventCount: 95_000,
      orgOverrides: { approachingLimitNotifiedPeriodStart: "2026-07-01" },
    });

    await usageService.updateOrganizationsMonthlyUsage();

    expect(mocks.sendApproachingLimitEmail).toHaveBeenCalledTimes(1);
  });

  it("sends only the exceeded email once the limit is actually passed", async () => {
    singleOrg({ subscription: stripeSub({ eventLimit: 100_000 }), eventCount: 100_001 });

    await usageService.updateOrganizationsMonthlyUsage();

    expect(mocks.sendApproachingLimitEmail).not.toHaveBeenCalled();
    expect(mocks.sendLimitExceededEmail).toHaveBeenCalledTimes(1);
  });

  it("records the warning even when the email fails, so it is not retried every 30 minutes", async () => {
    mocks.sendApproachingLimitEmail.mockRejectedValue(new Error("smtp down"));
    singleOrg({ subscription: stripeSub({ eventLimit: 100_000 }), eventCount: 95_000 });

    await usageService.updateOrganizationsMonthlyUsage();

    expect(state.updates[0]).toMatchObject({ approachingLimitNotifiedPeriodStart: "2026-08-01" });
  });
});

describe("updateOrganizationsMonthlyUsage — session replay gating", () => {
  it("blocks replays for a plan that does not include them", async () => {
    singleOrg({ subscription: stripeSub({ planName: "standard100k", replayLimit: 50_000 }), replayCount: 0 });

    await usageService.updateOrganizationsMonthlyUsage();

    expect(usageService.isSiteWithoutReplay(1)).toBe(true);
  });

  it("allows replays below the plan's quota", async () => {
    singleOrg({ subscription: stripeSub({ planName: "pro500k", replayLimit: 1_000 }), replayCount: 999 });

    await usageService.updateOrganizationsMonthlyUsage();

    expect(usageService.isSiteWithoutReplay(1)).toBe(false);
    expect(usageService.getSitesWithoutReplay().size).toBe(0);
  });

  it("blocks replays once the quota is exactly reached", async () => {
    singleOrg({ subscription: stripeSub({ planName: "pro500k", replayLimit: 1_000 }), replayCount: 1_000 });

    await usageService.updateOrganizationsMonthlyUsage();

    expect(usageService.isSiteWithoutReplay(1)).toBe(true);
  });

  it("unblocks replays after a downgrade is reversed", async () => {
    usageService.setSitesWithoutReplay(new Set([1]));
    singleOrg({ subscription: stripeSub({ planName: "pro500k", replayLimit: 1_000 }), replayCount: 0 });

    await usageService.updateOrganizationsMonthlyUsage();

    expect(usageService.isSiteWithoutReplay(1)).toBe(false);
  });

  it("counts replays across all of an org's sites against one quota", async () => {
    state.organizations = [org("org_1")];
    state.sites = [
      { siteId: 1, organizationId: "org_1" },
      { siteId: 2, organizationId: "org_1" },
    ];
    state.subscriptions.set("org_1", stripeSub({ planName: "pro500k", replayLimit: 1_000 }));
    state.replayCounts = [
      { site_id: 1, count: "600" },
      { site_id: 2, count: "400" },
    ];

    await usageService.updateOrganizationsMonthlyUsage();

    expect([...usageService.getSitesWithoutReplay()].sort()).toEqual([1, 2]);
  });

  it("blocks replays for free-tier orgs", async () => {
    singleOrg({ subscription: freeSub(), replayCount: 0 });

    await usageService.updateOrganizationsMonthlyUsage();

    expect(usageService.isSiteWithoutReplay(1)).toBe(true);
  });

  it("never blocks replays for a custom (uncapped) plan", async () => {
    singleOrg({
      subscription: {
        source: "custom",
        planName: "custom",
        eventLimit: 50_000_000,
        memberLimit: null,
        siteLimit: null,
        periodStart: "2026-08-01",
        status: "active",
        interval: "lifetime",
        cancelAtPeriodEnd: false,
      },
      replayCount: 10_000_000,
    });

    await usageService.updateOrganizationsMonthlyUsage();

    expect(usageService.isSiteWithoutReplay(1)).toBe(false);
  });
});

describe("updateOrganizationsMonthlyUsage — resilience and notification", () => {
  it("keeps processing later organizations when one fails", async () => {
    state.organizations = [org("org_bad"), org("org_good")];
    state.sites = [
      { siteId: 1, organizationId: "org_bad" },
      { siteId: 2, organizationId: "org_good" },
    ];
    state.subscriptions.set("org_bad", new Error("subscription lookup failed"));
    state.subscriptions.set("org_good", stripeSub({ eventLimit: 100 }));
    state.eventCounts = [{ site_id: 2, count: "500" }];

    await usageService.updateOrganizationsMonthlyUsage();

    expect(state.updates).toHaveLength(1);
    expect(state.updates[0]).toMatchObject({ monthlyEventCount: 500, overMonthlyLimit: true });
    expect(usageService.isSiteOverLimit(2)).toBe(true);
    expect(usageService.isSiteOverLimit(1)).toBe(false);
  });

  it("notifies registered listeners once the run completes", async () => {
    const callback = vi.fn();
    usageService.onUsageUpdated(callback);
    singleOrg({ eventCount: 0 });

    await usageService.updateOrganizationsMonthlyUsage();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("does not notify listeners when the run is skipped", async () => {
    const callback = vi.fn();
    usageService.onUsageUpdated(callback);
    mocks.getAllStripeSubscriptionsByCustomer.mockRejectedValue(new Error("stripe is down"));

    await usageService.updateOrganizationsMonthlyUsage();

    expect(callback).not.toHaveBeenCalled();
  });
});
