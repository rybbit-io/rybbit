import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppSumoSubscriptionInfo, StripeSubscriptionInfo } from "../../lib/subscriptionUtils.js";

const state = vi.hoisted(() => ({
  isCloud: true,
  site: null as Record<string, unknown> | null,
  orgRow: null as { stripeCustomerId: string | null } | null,
  updates: [] as Record<string, unknown>[],
}));

const mocks = vi.hoisted(() => ({
  getBestSubscription: vi.fn(),
  updateConfig: vi.fn(async () => {}),
  getConfig: vi.fn(async () => ({ siteId: 1 })),
}));

vi.mock("../../db/postgres/postgres.js", () => ({
  db: {
    query: {
      sites: {
        findFirst: vi.fn(async () => state.site),
      },
    },
    // Only used for the organization stripeCustomerId lookup in the replay gate.
    select: vi.fn(() => ({
      from: () => ({
        where: () => ({
          limit: async () => (state.orgRow ? [state.orgRow] : []),
        }),
      }),
    })),
    update: vi.fn(() => ({
      set: (data: Record<string, unknown>) => ({
        where: async () => {
          state.updates.push(data);
        },
      }),
    })),
  },
}));

vi.mock("../../lib/const.js", async importOriginal => {
  const actual = await importOriginal<typeof import("../../lib/const.js")>();
  return {
    ...actual,
    get IS_CLOUD() {
      return state.isCloud;
    },
  };
});

vi.mock("../../lib/siteConfig.js", () => ({
  siteConfig: { updateConfig: mocks.updateConfig, getConfig: mocks.getConfig },
}));

// Keep the real subscriptionIncludesReplay so the test exercises the actual
// entitlement rules; only the subscription lookup itself is stubbed.
vi.mock("../../lib/subscriptionUtils.js", async importOriginal => {
  const actual = await importOriginal<typeof import("../../lib/subscriptionUtils.js")>();
  return { ...actual, getBestSubscription: mocks.getBestSubscription };
});

import { updateSiteConfig } from "./updateSiteConfig.js";

function replyStub() {
  const reply: any = { statusCode: 200 };
  reply.status = (code: number) => {
    reply.statusCode = code;
    return reply;
  };
  reply.send = (body: unknown) => {
    reply.body = body;
    return reply;
  };
  return reply;
}

function makeRequest(body: Record<string, unknown>, siteId = "1") {
  return { params: { siteId }, body } as any;
}

function makeSite(overrides: Record<string, unknown> = {}) {
  return {
    siteId: 1,
    id: "abcdef123456",
    type: null,
    domain: "example.com",
    organizationId: "org_1",
    sessionReplay: false,
    ...overrides,
  };
}

function stripeSubscription(planName: string, overrides: Partial<StripeSubscriptionInfo> = {}): StripeSubscriptionInfo {
  return {
    source: "stripe",
    subscriptionId: "sub_1",
    priceId: "price_1",
    planName,
    eventLimit: 100_000,
    replayLimit: 0,
    periodStart: "2026-07-01",
    currentPeriodEnd: new Date("2026-08-01T00:00:00Z"),
    status: "active",
    interval: "month",
    cancelAtPeriodEnd: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  state.isCloud = true;
  state.site = makeSite();
  state.orgRow = { stripeCustomerId: "cus_1" };
  state.updates.length = 0;
  mocks.getBestSubscription.mockResolvedValue(stripeSubscription("basic-100k"));
});

describe("updateSiteConfig — session replay pro gating (the only subscription-gated field)", () => {
  it("rejects enabling session replay on a non-pro plan and writes nothing", async () => {
    mocks.getBestSubscription.mockResolvedValue(stripeSubscription("basic-100k", { replayLimit: 2500 }));
    const reply = replyStub();

    await updateSiteConfig(makeRequest({ sessionReplay: true }), reply);

    expect(reply.statusCode).toBe(403);
    expect(reply.body.error).toBe("Session replay requires a Pro plan");
    expect(state.updates).toHaveLength(0);
    expect(mocks.updateConfig).not.toHaveBeenCalled();
    expect(mocks.getBestSubscription).toHaveBeenCalledWith("org_1", "cus_1");
  });

  it("allows enabling session replay on a pro plan", async () => {
    mocks.getBestSubscription.mockResolvedValue(stripeSubscription("pro-1m", { replayLimit: 10_000 }));
    const reply = replyStub();

    await updateSiteConfig(makeRequest({ sessionReplay: true }), reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.body.success).toBe(true);
    expect(state.updates[0]).toMatchObject({ sessionReplay: true });
    expect(mocks.updateConfig).toHaveBeenCalledWith(1, expect.objectContaining({ sessionReplay: true }));
  });

  it("rejects enabling session replay during a large (>=500k events) pro trial", async () => {
    mocks.getBestSubscription.mockResolvedValue(
      stripeSubscription("pro-1m", { status: "trialing", eventLimit: 500_000, replayLimit: 10_000 })
    );
    const reply = replyStub();

    await updateSiteConfig(makeRequest({ sessionReplay: true }), reply);

    expect(reply.statusCode).toBe(403);
    expect(state.updates).toHaveLength(0);
  });

  it("allows enabling session replay on an AppSumo tier with a replay entitlement", async () => {
    const appsumo: AppSumoSubscriptionInfo = {
      source: "appsumo",
      tier: "4",
      eventLimit: 1_000_000,
      replayLimit: 5_000,
      periodStart: "2026-07-01",
      planName: "appsumo-4",
      status: "active",
      interval: "lifetime",
      cancelAtPeriodEnd: false,
    };
    mocks.getBestSubscription.mockResolvedValue(appsumo);
    const reply = replyStub();

    await updateSiteConfig(makeRequest({ sessionReplay: true }), reply);

    expect(reply.statusCode).toBe(200);
    expect(state.updates[0]).toMatchObject({ sessionReplay: true });
  });

  it("always allows turning session replay off, without a subscription lookup", async () => {
    state.site = makeSite({ sessionReplay: true });
    const reply = replyStub();

    await updateSiteConfig(makeRequest({ sessionReplay: false }), reply);

    expect(reply.statusCode).toBe(200);
    expect(state.updates[0]).toMatchObject({ sessionReplay: false });
    expect(mocks.getBestSubscription).not.toHaveBeenCalled();
  });

  it("rejects enabling session replay on a cloud site with no organization", async () => {
    // Pinning actual behavior: when site.organizationId is null, includesReplay stays
    // false and the request is rejected — an orphan site can never enable replay on cloud.
    state.site = makeSite({ organizationId: null });
    const reply = replyStub();

    await updateSiteConfig(makeRequest({ sessionReplay: true }), reply);

    expect(reply.statusCode).toBe(403);
    expect(mocks.getBestSubscription).not.toHaveBeenCalled();
    expect(state.updates).toHaveLength(0);
  });
});

describe("updateSiteConfig — self-hosted (IS_CLOUD=false) bypass", () => {
  it("allows enabling session replay without any subscription lookup", async () => {
    state.isCloud = false;
    const reply = replyStub();

    await updateSiteConfig(makeRequest({ sessionReplay: true }), reply);

    expect(reply.statusCode).toBe(200);
    expect(mocks.getBestSubscription).not.toHaveBeenCalled();
    expect(state.updates[0]).toMatchObject({ sessionReplay: true });
  });
});

describe("updateSiteConfig — non-gated fields update without subscription checks", () => {
  it("updates settings and analytics toggles on a non-pro cloud plan", async () => {
    const reply = replyStub();

    await updateSiteConfig(
      makeRequest({
        name: "Renamed",
        public: true,
        blockBots: false,
        webVitals: true,
        trackErrors: true,
        excludedCountries: ["US", "GB"],
        tags: ["prod"],
      }),
      reply
    );

    expect(reply.statusCode).toBe(200);
    expect(mocks.getBestSubscription).not.toHaveBeenCalled();
    expect(state.updates[0]).toMatchObject({
      name: "Renamed",
      public: true,
      blockBots: false,
      webVitals: true,
      trackErrors: true,
      excludedCountries: ["US", "GB"],
      tags: ["prod"],
    });
    expect(mocks.updateConfig).toHaveBeenCalledWith(1, state.updates[0]);
  });

  it("cleans and stores an updated domain", async () => {
    const reply = replyStub();

    await updateSiteConfig(makeRequest({ domain: "https://new.example.com/" }), reply);

    expect(reply.statusCode).toBe(200);
    expect(state.updates[0]).toMatchObject({ domain: "new.example.com" });
  });

  it("rejects invalid excluded IP patterns", async () => {
    const reply = replyStub();

    await updateSiteConfig(makeRequest({ excludedIPs: ["999.999.0.1"] }), reply);

    expect(reply.statusCode).toBe(400);
    expect(reply.body.error).toBe("Invalid IP patterns");
    expect(state.updates).toHaveLength(0);
  });
});

describe("updateSiteConfig — request validation", () => {
  it("rejects a non-numeric site id", async () => {
    const reply = replyStub();

    await updateSiteConfig(makeRequest({ name: "x" }, "abc"), reply);

    expect(reply.statusCode).toBe(400);
    expect(reply.body.error).toContain("Invalid site ID");
  });

  it("returns 404 for an unknown site", async () => {
    state.site = null;
    const reply = replyStub();

    await updateSiteConfig(makeRequest({ name: "x" }), reply);

    expect(reply.statusCode).toBe(404);
  });

  it("rejects enabling session replay on a mobile site before the pro gate", async () => {
    state.site = makeSite({ type: "mobile", domain: "com.example.app" });
    const reply = replyStub();

    await updateSiteConfig(makeRequest({ sessionReplay: true }), reply);

    expect(reply.statusCode).toBe(400);
    expect(reply.body.error).toBe("Session replay and Web Vitals are only available for web sites");
    expect(mocks.getBestSubscription).not.toHaveBeenCalled();
  });

  it("rejects an empty update", async () => {
    const reply = replyStub();

    await updateSiteConfig(makeRequest({}), reply);

    expect(reply.statusCode).toBe(400);
    expect(reply.body.error).toBe("No fields to update");
  });
});
