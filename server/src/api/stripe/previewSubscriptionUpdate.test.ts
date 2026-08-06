import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  subscriptionsList: vi.fn(),
  pricesRetrieve: vi.fn(),
  invoicesCreatePreview: vi.fn(),
}));

vi.mock("../../lib/stripe.js", () => ({
  stripe: {
    subscriptions: { list: mocks.subscriptionsList },
    prices: { retrieve: mocks.pricesRetrieve },
    invoices: { createPreview: mocks.invoicesCreatePreview },
  },
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
import { previewSubscriptionUpdate } from "./previewSubscriptionUpdate.js";

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
  return { user: userId ? { id: userId } : undefined, body } as any;
}

const PERIOD_END = 1760000000;

function fakeSubscription(status: "active" | "trialing") {
  return {
    id: "sub_1",
    status,
    items: { data: [{ id: "si_1", price: { id: "price_old" }, current_period_end: PERIOD_END }] },
  };
}

const validBody = { organizationId: "org_1", newPriceId: "price_new" };

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
  mocks.pricesRetrieve.mockImplementation(async (priceId: string) => ({
    id: priceId,
    unit_amount: priceId === "price_new" ? 4900 : 1900,
    recurring: { interval: "month" },
  }));
  mocks.invoicesCreatePreview.mockResolvedValue({
    amount_due: 2500,
    lines: {
      data: [
        { amount: -1000, parent: { subscription_item_details: { proration: true } } },
        { amount: 3500, parent: { subscription_item_details: { proration: true } } },
        { amount: 4900, parent: { subscription_item_details: { proration: false } } },
      ],
    },
  });
});

describe("previewSubscriptionUpdate — authorization", () => {
  it("returns a proration preview for the org owner", async () => {
    const reply = replyStub();

    await previewSubscriptionUpdate(requestStub("u_owner", validBody), reply);

    expect(reply.statusCode).toBe(200);
    expect(mocks.invoicesCreatePreview).toHaveBeenCalledWith({
      customer: "cus_1",
      subscription: "sub_1",
      subscription_details: {
        items: [{ id: "si_1", price: "price_new" }],
        proration_behavior: "always_invoice",
      },
    });
    expect(reply.body).toEqual({
      success: true,
      preview: {
        isTrialing: false,
        currentPlan: { priceId: "price_old", amount: 1900, interval: "month" },
        newPlan: { priceId: "price_new", amount: 4900, interval: "month" },
        proration: {
          // Only lines flagged proration:true count; amounts convert cents to dollars.
          credit: 10,
          charge: 35,
          immediatePayment: 25,
          nextBillingDate: new Date(PERIOD_END * 1000).toISOString(),
        },
      },
    });
  });

  it("rejects a non-owner member with 403 and calls no Stripe API", async () => {
    const reply = replyStub();

    await previewSubscriptionUpdate(requestStub("u_member", validBody), reply);

    expect(reply.statusCode).toBe(403);
    expect(reply.body.error).toBe("Only organization owners can manage billing");
    expect(mocks.subscriptionsList).not.toHaveBeenCalled();
    expect(mocks.invoicesCreatePreview).not.toHaveBeenCalled();
  });

  it("rejects a user with no membership in the target org (cross-org attempt)", async () => {
    const reply = replyStub();

    // u_outsider owns org_2 but must not preview org_1's billing.
    await previewSubscriptionUpdate(requestStub("u_outsider", validBody), reply);

    expect(reply.statusCode).toBe(403);
    expect(mocks.invoicesCreatePreview).not.toHaveBeenCalled();
  });

  it("returns 401 when there is no authenticated user", async () => {
    const reply = replyStub();

    await previewSubscriptionUpdate(requestStub(undefined, validBody), reply);

    expect(reply.statusCode).toBe(401);
    expect(mocks.invoicesCreatePreview).not.toHaveBeenCalled();
  });

  it("returns 400 when organizationId or newPriceId is missing", async () => {
    for (const body of [{ newPriceId: "price_new" }, { organizationId: "org_1" }, {}]) {
      const reply = replyStub();
      await previewSubscriptionUpdate(requestStub("u_owner", body), reply);
      expect(reply.statusCode).toBe(400);
      expect(reply.body.error).toContain("Missing required parameters");
    }
    expect(mocks.invoicesCreatePreview).not.toHaveBeenCalled();
  });
});

describe("previewSubscriptionUpdate — branches", () => {
  it("returns a zero-proration preview for trialing subscriptions without hitting the invoice API", async () => {
    mocks.subscriptionsList.mockImplementation(async ({ status }: any) =>
      status === "trialing" ? { data: [fakeSubscription("trialing")] } : { data: [] }
    );
    const reply = replyStub();

    await previewSubscriptionUpdate(requestStub("u_owner", validBody), reply);

    expect(reply.statusCode).toBe(200);
    expect(mocks.invoicesCreatePreview).not.toHaveBeenCalled();
    expect(reply.body.preview.isTrialing).toBe(true);
    expect(reply.body.preview.proration).toEqual({
      credit: 0,
      charge: 0,
      immediatePayment: 0,
      nextBillingDate: new Date(PERIOD_END * 1000).toISOString(),
    });
  });

  it("returns 404 when the org has no Stripe customer ID", async () => {
    await (sql as any).exec(`UPDATE "organization" SET "stripeCustomerId" = NULL WHERE "id" = 'org_1'`);
    const reply = replyStub();

    await previewSubscriptionUpdate(requestStub("u_owner", validBody), reply);

    expect(reply.statusCode).toBe(404);
    expect(mocks.subscriptionsList).not.toHaveBeenCalled();
  });

  it("returns 404 when no active or trialing subscription exists", async () => {
    mocks.subscriptionsList.mockResolvedValue({ data: [] });
    const reply = replyStub();

    await previewSubscriptionUpdate(requestStub("u_owner", validBody), reply);

    expect(reply.statusCode).toBe(404);
    expect(reply.body.error).toBe("No active subscription found");
    expect(mocks.invoicesCreatePreview).not.toHaveBeenCalled();
  });
});
