import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  isCloud: true,
  site: null as Record<string, unknown> | null,
  updates: [] as Record<string, unknown>[],
}));

const mocks = vi.hoisted(() => ({
  getSubscriptionInner: vi.fn(),
  invalidate: vi.fn(),
  getConfig: vi.fn(async () => ({ siteId: 1 })),
}));

vi.mock("../../db/postgres/postgres.js", () => ({
  db: {
    query: {
      sites: {
        findFirst: vi.fn(async () => state.site),
      },
    },
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
  siteConfig: { invalidate: mocks.invalidate, getConfig: mocks.getConfig },
}));

vi.mock("../stripe/getSubscription.js", () => {
  return { getSubscriptionInner: mocks.getSubscriptionInner };
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

function subscription(includesReplay: boolean) {
  return {
    planName: includesReplay ? "pro-1m" : "basic-100k",
    status: "active",
    siteLimit: includesReplay ? null : 1,
    includesReplay,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  state.isCloud = true;
  state.site = makeSite();
  state.updates.length = 0;
  mocks.getSubscriptionInner.mockResolvedValue(subscription(false));
});

describe("updateSiteConfig — session replay pro gating (the only subscription-gated field)", () => {
  it("rejects enabling session replay on a non-pro plan and writes nothing", async () => {
    mocks.getSubscriptionInner.mockResolvedValue(subscription(false));
    const reply = replyStub();

    await updateSiteConfig(makeRequest({ sessionReplay: true }), reply);

    expect(reply.statusCode).toBe(403);
    expect(reply.body.error).toBe("Session replay requires a Pro plan");
    expect(state.updates).toHaveLength(0);
    expect(mocks.invalidate).not.toHaveBeenCalled();
    expect(mocks.getSubscriptionInner).toHaveBeenCalledWith("org_1");
  });

  it("allows enabling session replay on a pro plan", async () => {
    mocks.getSubscriptionInner.mockResolvedValue(subscription(true));
    const reply = replyStub();

    await updateSiteConfig(makeRequest({ sessionReplay: true }), reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.body.success).toBe(true);
    expect(state.updates[0]).toMatchObject({ sessionReplay: true });
    expect(mocks.invalidate).toHaveBeenCalledWith(state.site);
  });

  it("rejects enabling session replay during a large (>=500k events) pro trial", async () => {
    mocks.getSubscriptionInner.mockResolvedValue({
      ...subscription(false),
      planName: "pro-1m",
      status: "trialing",
    });
    const reply = replyStub();

    await updateSiteConfig(makeRequest({ sessionReplay: true }), reply);

    expect(reply.statusCode).toBe(403);
    expect(state.updates).toHaveLength(0);
  });

  it("allows enabling session replay on an AppSumo tier with a replay entitlement", async () => {
    mocks.getSubscriptionInner.mockResolvedValue({ ...subscription(true), planName: "appsumo-4" });
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
    expect(mocks.getSubscriptionInner).not.toHaveBeenCalled();
  });

  it("rejects enabling session replay on a cloud site with no organization", async () => {
    // Pinning actual behavior: when site.organizationId is null, includesReplay stays
    // false and the request is rejected — an orphan site can never enable replay on cloud.
    state.site = makeSite({ organizationId: null });
    const reply = replyStub();

    await updateSiteConfig(makeRequest({ sessionReplay: true }), reply);

    expect(reply.statusCode).toBe(403);
    expect(mocks.getSubscriptionInner).not.toHaveBeenCalled();
    expect(state.updates).toHaveLength(0);
  });
});

describe("updateSiteConfig — self-hosted (IS_CLOUD=false) bypass", () => {
  it("allows enabling session replay without any subscription lookup", async () => {
    state.isCloud = false;
    const reply = replyStub();

    await updateSiteConfig(makeRequest({ sessionReplay: true }), reply);

    expect(reply.statusCode).toBe(200);
    expect(mocks.getSubscriptionInner).not.toHaveBeenCalled();
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
    expect(mocks.getSubscriptionInner).not.toHaveBeenCalled();
    expect(state.updates[0]).toMatchObject({
      name: "Renamed",
      public: true,
      blockBots: false,
      webVitals: true,
      trackErrors: true,
      excludedCountries: ["US", "GB"],
      tags: ["prod"],
    });
    expect(mocks.invalidate).toHaveBeenCalledWith(state.site);
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
    expect(mocks.getSubscriptionInner).not.toHaveBeenCalled();
  });

  it("rejects an empty update", async () => {
    const reply = replyStub();

    await updateSiteConfig(makeRequest({}), reply);

    expect(reply.statusCode).toBe(400);
    expect(reply.body.error).toBe("No fields to update");
  });
});
