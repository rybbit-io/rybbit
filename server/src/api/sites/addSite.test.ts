import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  isCloud: true,
  existingSiteCount: 0,
  insertedValues: [] as Record<string, unknown>[],
}));

const mocks = vi.hoisted(() => ({
  getSubscriptionInner: vi.fn(),
}));

vi.mock("../../db/postgres/postgres.js", () => ({
  db: {
    select: vi.fn(() => ({
      from: () => ({
        where: async () => Array.from({ length: state.existingSiteCount }, (_, i) => ({ siteId: i + 1 })),
      }),
    })),
    insert: vi.fn(() => ({
      values: (values: Record<string, unknown>) => ({
        returning: async () => {
          state.insertedValues.push(values);
          return [{ siteId: 1, ...values }];
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

vi.mock("../stripe/getSubscription.js", () => ({
  getSubscriptionInner: mocks.getSubscriptionInner,
}));

import { addSite } from "./addSite.js";

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

function makeRequest(body: Record<string, unknown>, organizationId = "org_1") {
  return {
    params: { organizationId },
    body: { domain: "example.com", name: "Example", ...body },
    user: { id: "u_1" },
  } as any;
}

/** Shape returned by getSubscriptionInner — only the fields addSite reads. */
function subscription(overrides: Partial<{ planName: string; status: string; siteLimit: number | null }> = {}) {
  return { planName: "basic-100k", status: "active", siteLimit: 1, ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  state.isCloud = true;
  state.existingSiteCount = 0;
  state.insertedValues.length = 0;
  mocks.getSubscriptionInner.mockResolvedValue(subscription());
});

describe("addSite — cloud pro-feature gating (session replay)", () => {
  it("rejects session replay on a non-pro plan and inserts nothing", async () => {
    mocks.getSubscriptionInner.mockResolvedValue(subscription({ planName: "basic-100k", status: "active" }));
    const reply = replyStub();

    await addSite(makeRequest({ sessionReplay: true }), reply);

    expect(reply.statusCode).toBe(403);
    expect(reply.body.error).toBe("Session replay requires a Pro subscription");
    expect(state.insertedValues).toHaveLength(0);
  });

  it("returns 404 before any feature gating when the org does not exist", async () => {
    mocks.getSubscriptionInner.mockResolvedValue(null);
    const reply = replyStub();

    await addSite(makeRequest({ sessionReplay: true }), reply);

    expect(reply.statusCode).toBe(404);
    expect(reply.body.error).toBe("Organization not found");
    expect(state.insertedValues).toHaveLength(0);
  });

  it("allows session replay on a pro plan", async () => {
    mocks.getSubscriptionInner.mockResolvedValue(subscription({ planName: "pro-1m", siteLimit: null }));
    const reply = replyStub();

    await addSite(makeRequest({ sessionReplay: true }), reply);

    expect(reply.statusCode).toBe(201);
    expect(state.insertedValues).toHaveLength(1);
    expect(state.insertedValues[0].sessionReplay).toBe(true);
  });
});

describe("addSite — cloud standard-feature gating (active subscription required)", () => {
  it("rejects standard features for a free-tier org and names each requested feature", async () => {
    mocks.getSubscriptionInner.mockResolvedValue(subscription({ planName: "free", status: "free", siteLimit: 1 }));
    const reply = replyStub();

    await addSite(makeRequest({ webVitals: true, trackErrors: true }), reply);

    expect(reply.statusCode).toBe(403);
    expect(reply.body.error).toBe("The following features require an active subscription: webVitals, trackErrors");
    expect(state.insertedValues).toHaveLength(0);
  });

  it("allows standard features on a trialing subscription (trialing counts as paying)", async () => {
    // A pro trial gets standard features, consistent with session replay also being
    // granted during trial.
    mocks.getSubscriptionInner.mockResolvedValue(
      subscription({ planName: "pro-1m", status: "trialing", siteLimit: null })
    );
    const reply = replyStub();

    await addSite(makeRequest({ trackCopy: true, trackFormInteractions: true }), reply);

    expect(reply.statusCode).toBe(201);
    expect(state.insertedValues[0]).toMatchObject({ trackCopy: true, trackFormInteractions: true });
  });

  it("allows standard features on any active subscription", async () => {
    mocks.getSubscriptionInner.mockResolvedValue(subscription({ planName: "standard-250k", siteLimit: 5 }));
    const reply = replyStub();

    await addSite(makeRequest({ webVitals: true, trackButtonClicks: true }), reply);

    expect(reply.statusCode).toBe(201);
    expect(state.insertedValues[0]).toMatchObject({ webVitals: true, trackButtonClicks: true });
  });

  it("does not gate a plain site (no premium features) on subscription status", async () => {
    mocks.getSubscriptionInner.mockResolvedValue(subscription({ planName: "free", status: "free", siteLimit: 1 }));
    const reply = replyStub();

    await addSite(makeRequest({}), reply);

    expect(reply.statusCode).toBe(201);
    expect(state.insertedValues).toHaveLength(1);
  });
});

describe("addSite — cloud site-limit enforcement", () => {
  it("rejects when the org is at its site limit and inserts nothing", async () => {
    mocks.getSubscriptionInner.mockResolvedValue(subscription({ siteLimit: 2 }));
    state.existingSiteCount = 2;
    const reply = replyStub();

    await addSite(makeRequest({}), reply);

    expect(reply.statusCode).toBe(403);
    expect(reply.body.error).toBe(
      "You have reached the limit of 2 websites for your plan. Please upgrade to add more."
    );
    expect(state.insertedValues).toHaveLength(0);
  });

  it("uses the singular form for a limit of 1", async () => {
    mocks.getSubscriptionInner.mockResolvedValue(subscription({ siteLimit: 1 }));
    state.existingSiteCount = 1;
    const reply = replyStub();

    await addSite(makeRequest({}), reply);

    expect(reply.statusCode).toBe(403);
    expect(reply.body.error).toContain("limit of 1 website for your plan");
  });

  it("allows adding a site while under the limit", async () => {
    mocks.getSubscriptionInner.mockResolvedValue(subscription({ siteLimit: 2 }));
    state.existingSiteCount = 1;
    const reply = replyStub();

    await addSite(makeRequest({}), reply);

    expect(reply.statusCode).toBe(201);
    expect(state.insertedValues).toHaveLength(1);
  });

  it("treats a null siteLimit as unlimited", async () => {
    mocks.getSubscriptionInner.mockResolvedValue(subscription({ planName: "pro-1m", siteLimit: null }));
    state.existingSiteCount = 500;
    const reply = replyStub();

    await addSite(makeRequest({}), reply);

    expect(reply.statusCode).toBe(201);
  });

  it("returns 404 and inserts nothing when the organization does not exist", async () => {
    // getSubscriptionInner returns null only when the organization row is missing;
    // a missing org gets no site at all, regardless of existing site count.
    mocks.getSubscriptionInner.mockResolvedValue(null);
    for (const existingSiteCount of [0, 500]) {
      state.existingSiteCount = existingSiteCount;
      const reply = replyStub();

      await addSite(makeRequest({}), reply);

      expect(reply.statusCode).toBe(404);
      expect(reply.body.error).toBe("Organization not found");
    }
    expect(state.insertedValues).toHaveLength(0);
  });
});

describe("addSite — self-hosted (IS_CLOUD=false) bypasses all gating", () => {
  beforeEach(() => {
    state.isCloud = false;
  });

  it("allows session replay and standard features without any subscription check", async () => {
    const reply = replyStub();

    await addSite(makeRequest({ sessionReplay: true, webVitals: true, trackErrors: true }), reply);

    expect(reply.statusCode).toBe(201);
    expect(mocks.getSubscriptionInner).not.toHaveBeenCalled();
    expect(state.insertedValues[0]).toMatchObject({ sessionReplay: true, webVitals: true, trackErrors: true });
  });

  it("enforces no site limit", async () => {
    state.existingSiteCount = 500;
    const reply = replyStub();

    await addSite(makeRequest({}), reply);

    expect(reply.statusCode).toBe(201);
  });
});

describe("addSite — domain validation", () => {
  it("rejects an invalid web domain before any subscription check", async () => {
    const reply = replyStub();

    await addSite(makeRequest({ domain: "not_a_domain" }), reply);

    expect(reply.statusCode).toBe(400);
    expect(reply.body.error).toContain("Invalid domain format");
    expect(mocks.getSubscriptionInner).not.toHaveBeenCalled();
    expect(state.insertedValues).toHaveLength(0);
  });

  it("strips protocol and trailing slashes before validating and storing", async () => {
    const reply = replyStub();

    await addSite(makeRequest({ domain: "https://sub.example.com//" }), reply);

    expect(reply.statusCode).toBe(201);
    expect(state.insertedValues[0].domain).toBe("sub.example.com");
  });

  it("stores web sites with a null type", async () => {
    const reply = replyStub();

    await addSite(makeRequest({ type: "web" }), reply);

    expect(reply.statusCode).toBe(201);
    expect(state.insertedValues[0].type).toBeNull();
  });

  it("accepts a bundle identifier for mobile sites", async () => {
    const reply = replyStub();

    await addSite(makeRequest({ type: "mobile", domain: "com.example.app" }), reply);

    expect(reply.statusCode).toBe(201);
    expect(state.insertedValues[0]).toMatchObject({ type: "mobile", domain: "com.example.app" });
  });

  it("rejects an invalid mobile app identifier", async () => {
    const reply = replyStub();

    await addSite(makeRequest({ type: "mobile", domain: "..bad identifier!" }), reply);

    expect(reply.statusCode).toBe(400);
    expect(reply.body.error).toContain("Invalid app identifier");
    expect(state.insertedValues).toHaveLength(0);
  });

  it("rejects session replay and web vitals for mobile sites", async () => {
    const reply = replyStub();

    await addSite(makeRequest({ type: "mobile", domain: "com.example.app", sessionReplay: true }), reply);

    expect(reply.statusCode).toBe(400);
    expect(reply.body.error).toBe("Session replay and Web Vitals are only available for web sites");
    expect(state.insertedValues).toHaveLength(0);
  });
});
