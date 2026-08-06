import Stripe from "stripe";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  subscriptionsList: vi.fn(),
  subscriptionsUpdate: vi.fn(),
  subscriptionsRetrieve: vi.fn(),
  pricesRetrieve: vi.fn(),
  invalidateStripeSubscriptionCache: vi.fn(),
}));

vi.mock("../../lib/stripe.js", () => ({
  stripe: {
    subscriptions: {
      list: mocks.subscriptionsList,
      update: mocks.subscriptionsUpdate,
      retrieve: mocks.subscriptionsRetrieve,
    },
    prices: { retrieve: mocks.pricesRetrieve },
  },
}));

vi.mock("../../lib/subscriptionUtils.js", () => ({
  invalidateStripeSubscriptionCache: mocks.invalidateStripeSubscriptionCache,
}));

// Real Drizzle queries against PGlite so the inline membership check — the SOLE
// authorization gate on this route — is exercised for real.
vi.mock("../../db/postgres/postgres.js", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("../../db/postgres/schema.js");
  const client = new PGlite();
  const db = drizzle(client, { schema });
  return { db, sql: client };
});

import { sql } from "../../db/postgres/postgres.js";
import { updateSubscription } from "./updateSubscription.js";

const DDL = `
CREATE TABLE "organization" ("id" text PRIMARY KEY, "name" text NOT NULL, "slug" text, "createdAt" timestamp DEFAULT now(), "stripeCustomerId" text);
CREATE TABLE "member" ("id" text PRIMARY KEY, "organizationId" text NOT NULL, "userId" text NOT NULL, "role" text NOT NULL, "createdAt" timestamp DEFAULT now());
`;

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

function requestStub(userId: string | undefined, body: Record<string, unknown>) {
  return {
    user: userId ? { id: userId } : undefined,
    body,
    log: { error: vi.fn() },
  } as any;
}

function fakeSubscription(status: "active" | "trialing", overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_1",
    status,
    trial_end: null,
    items: { data: [{ id: "si_1", price: { id: "price_old" }, current_period_end: 1760000000 }] },
    ...overrides,
  };
}

function expectNoStripeMutation() {
  expect(mocks.subscriptionsUpdate).not.toHaveBeenCalled();
  expect(mocks.invalidateStripeSubscriptionCache).not.toHaveBeenCalled();
}

beforeAll(async () => {
  await (sql as any).exec(DDL);
});

beforeEach(async () => {
  vi.clearAllMocks();
  await (sql as any).exec(`TRUNCATE "organization", "member"`);
  await (sql as any).exec(`
    INSERT INTO "organization" ("id","name","slug","stripeCustomerId") VALUES
      ('org_1','Acme','acme','cus_1'),
      ('org_2','Rival','rival','cus_2');
    INSERT INTO "member" ("id","organizationId","userId","role") VALUES
      ('m_owner','org_1','u_owner','owner'),
      ('m_member','org_1','u_member','member'),
      ('m_outsider','org_2','u_outsider','owner');
  `);
  mocks.subscriptionsList.mockImplementation(async ({ status }: any) =>
    status === "active" ? { data: [fakeSubscription("active")] } : { data: [] }
  );
  mocks.subscriptionsUpdate.mockResolvedValue({ id: "sub_1" });
  mocks.subscriptionsRetrieve.mockResolvedValue({
    id: "sub_1",
    status: "active",
    items: { data: [{ current_period_end: 1760000000 }] },
  });
  mocks.pricesRetrieve.mockResolvedValue({ id: "price_new" });
});

describe("updateSubscription — authorization", () => {
  it("lets the org owner change the plan and invoices the proration", async () => {
    const reply = replyStub();

    await updateSubscription(requestStub("u_owner", { organizationId: "org_1", newPriceId: "price_new" }), reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.body).toEqual({
      success: true,
      subscription: {
        id: "sub_1",
        status: "active",
        currentPeriodEnd: new Date(1760000000 * 1000).toISOString(),
      },
    });
    expect(mocks.subscriptionsList).toHaveBeenCalledWith({ customer: "cus_1", status: "active", limit: 1 });
    expect(mocks.subscriptionsUpdate).toHaveBeenCalledWith("sub_1", {
      items: [{ id: "si_1", price: "price_new" }],
      proration_behavior: "always_invoice",
    });
    expect(mocks.invalidateStripeSubscriptionCache).toHaveBeenCalledWith("cus_1");
  });

  it("rejects a non-owner member with 403 and touches nothing in Stripe", async () => {
    const reply = replyStub();

    await updateSubscription(requestStub("u_member", { organizationId: "org_1", newPriceId: "price_new" }), reply);

    expect(reply.statusCode).toBe(403);
    expect(reply.body.error).toBe("Only organization owners can manage billing");
    expect(mocks.subscriptionsList).not.toHaveBeenCalled();
    expectNoStripeMutation();
  });

  it("rejects a user with no membership in the target org (cross-org attempt)", async () => {
    const reply = replyStub();

    // u_outsider owns org_2 but has no row in org_1 — owning some org must not help.
    await updateSubscription(requestStub("u_outsider", { organizationId: "org_1", newPriceId: "price_new" }), reply);

    expect(reply.statusCode).toBe(403);
    expect(mocks.subscriptionsList).not.toHaveBeenCalled();
    expectNoStripeMutation();
  });

  it("returns 401 when there is no authenticated user", async () => {
    const reply = replyStub();

    await updateSubscription(requestStub(undefined, { organizationId: "org_1", newPriceId: "price_new" }), reply);

    expect(reply.statusCode).toBe(401);
    expectNoStripeMutation();
  });

  it("returns 400 when organizationId or newPriceId is missing", async () => {
    for (const body of [{ newPriceId: "price_new" }, { organizationId: "org_1" }, {}]) {
      const reply = replyStub();
      await updateSubscription(requestStub("u_owner", body), reply);
      expect(reply.statusCode).toBe(400);
      expect(reply.body.error).toContain("Missing required parameters");
    }
    expectNoStripeMutation();
  });
});

describe("updateSubscription — plan-change branches", () => {
  it("preserves the trial when swapping plans on a trialing subscription", async () => {
    mocks.subscriptionsList.mockImplementation(async ({ status }: any) =>
      status === "trialing" ? { data: [fakeSubscription("trialing", { trial_end: 1765000000 })] } : { data: [] }
    );
    const reply = replyStub();

    await updateSubscription(requestStub("u_owner", { organizationId: "org_1", newPriceId: "price_new" }), reply);

    expect(reply.statusCode).toBe(200);
    expect(mocks.subscriptionsUpdate).toHaveBeenCalledWith("sub_1", {
      items: [{ id: "si_1", price: "price_new" }],
      proration_behavior: "none",
      trial_end: 1765000000,
    });
  });

  it("returns 400 when Stripe reports the price does not exist, without updating the subscription", async () => {
    mocks.pricesRetrieve.mockRejectedValue(
      new Stripe.errors.StripeInvalidRequestError({
        type: "invalid_request_error",
        code: "resource_missing",
        param: "price",
        message: "No such price: 'price_bogus'",
      } as any)
    );
    const reply = replyStub();

    await updateSubscription(requestStub("u_owner", { organizationId: "org_1", newPriceId: "price_bogus" }), reply);

    expect(reply.statusCode).toBe(400);
    expect(reply.body.error).toBe("Invalid price ID");
    expectNoStripeMutation();
  });

  it("returns 500 for a transient Stripe failure during price validation, without updating the subscription", async () => {
    // An outage/rate-limit style failure must not be misreported as a bad price ID.
    mocks.pricesRetrieve.mockRejectedValue(
      new Stripe.errors.StripeAPIError({ type: "api_error", message: "Stripe is temporarily unavailable" } as any)
    );
    const reply = replyStub();

    await updateSubscription(requestStub("u_owner", { organizationId: "org_1", newPriceId: "price_new" }), reply);

    expect(reply.statusCode).toBe(500);
    expect(reply.body.error).toBe("Failed to update subscription");
    expectNoStripeMutation();
  });

  it("returns 404 when the org has no Stripe customer ID", async () => {
    await (sql as any).exec(`UPDATE "organization" SET "stripeCustomerId" = NULL WHERE "id" = 'org_1'`);
    const reply = replyStub();

    await updateSubscription(requestStub("u_owner", { organizationId: "org_1", newPriceId: "price_new" }), reply);

    expect(reply.statusCode).toBe(404);
    expectNoStripeMutation();
  });

  it("returns 404 when no active or trialing subscription exists", async () => {
    mocks.subscriptionsList.mockResolvedValue({ data: [] });
    const reply = replyStub();

    await updateSubscription(requestStub("u_owner", { organizationId: "org_1", newPriceId: "price_new" }), reply);

    expect(reply.statusCode).toBe(404);
    expect(reply.body.error).toBe("No active subscription found");
    expectNoStripeMutation();
  });
});
