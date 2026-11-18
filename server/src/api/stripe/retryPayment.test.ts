import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class StripeCardError extends Error {
    code = "card_declined";
  }
  return {
    StripeCardError,
    subscriptionsList: vi.fn(),
    subscriptionsUpdate: vi.fn(),
    customersRetrieve: vi.fn(),
    invoicesPay: vi.fn(),
    invalidateStripeSubscriptionCache: vi.fn(),
    requestOrganizationRefresh: vi.fn(),
  };
});

vi.mock("stripe", () => ({ default: { errors: { StripeCardError: mocks.StripeCardError } } }));

vi.mock("../../lib/stripe.js", () => ({
  stripe: {
    subscriptions: { list: mocks.subscriptionsList, update: mocks.subscriptionsUpdate },
    customers: { retrieve: mocks.customersRetrieve },
    invoices: { pay: mocks.invoicesPay },
  },
}));

vi.mock("../../lib/subscriptionUtils.js", () => ({
  invalidateStripeSubscriptionCache: mocks.invalidateStripeSubscriptionCache,
}));

vi.mock("../../services/usageService.js", () => ({
  usageService: { requestOrganizationRefresh: mocks.requestOrganizationRefresh },
}));

// Real Drizzle queries against PGlite so the membership check, the only authorization gate on
// this route, is exercised for real.
vi.mock("../../db/postgres/postgres.js", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("../../db/postgres/schema.js");
  const client = new PGlite();
  const db = drizzle(client, { schema });
  return { db, sql: client };
});

import { sql } from "../../db/postgres/postgres.js";
import { retryPayment } from "./retryPayment.js";

const DDL = `
CREATE TABLE "organization" ("id" text PRIMARY KEY, "name" text NOT NULL, "slug" text, "createdAt" timestamp DEFAULT now(), "stripeCustomerId" text);
CREATE TABLE "member" ("id" text PRIMARY KEY, "organizationId" text NOT NULL, "userId" text NOT NULL, "role" text NOT NULL, "createdAt" timestamp DEFAULT now(), "has_restricted_site_access" boolean NOT NULL DEFAULT false);
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

const requestStub = (userId: string | undefined, body: Record<string, unknown>) =>
  ({ user: userId ? { id: userId } : undefined, body, log: { info: vi.fn(), error: vi.fn() } }) as any;

const pastDueSubscription = (overrides: Record<string, unknown> = {}) => ({
  id: "sub_1",
  created: 100,
  collection_method: "charge_automatically",
  default_payment_method: "pm_old",
  latest_invoice: "in_1",
  ...overrides,
});

beforeAll(async () => {
  await (sql as any).exec(DDL);
});

beforeEach(async () => {
  vi.clearAllMocks();
  await (sql as any).exec(`TRUNCATE "organization", "member"`);
  await (sql as any).exec(`
    INSERT INTO "organization" ("id","name","slug","stripeCustomerId") VALUES ('org_1','Acme','acme','cus_1');
    INSERT INTO "member" ("id","organizationId","userId","role") VALUES
      ('m_owner','org_1','u_owner','owner'),
      ('m_member','org_1','u_member','member');
  `);
  mocks.subscriptionsList.mockResolvedValue({ data: [pastDueSubscription()] });
  mocks.customersRetrieve.mockResolvedValue({ invoice_settings: { default_payment_method: "pm_new" } });
  mocks.subscriptionsUpdate.mockResolvedValue({});
  mocks.invoicesPay.mockResolvedValue({ status: "paid" });
});

describe("retryPayment", () => {
  it("moves the subscription onto the new card, pays the open invoice and refreshes the plan", async () => {
    const reply = replyStub();
    await retryPayment(requestStub("u_owner", { organizationId: "org_1" }), reply);

    expect(mocks.subscriptionsList).toHaveBeenCalledWith({ customer: "cus_1", status: "past_due", limit: 10 });
    expect(mocks.subscriptionsUpdate).toHaveBeenCalledWith("sub_1", { default_payment_method: "pm_new" });
    expect(mocks.invoicesPay).toHaveBeenCalledWith("in_1");
    expect(mocks.invalidateStripeSubscriptionCache).toHaveBeenCalledWith("cus_1");
    expect(mocks.requestOrganizationRefresh).toHaveBeenCalledWith("org_1");
    expect(reply.body).toEqual({ status: "paid" });
  });

  it("reports a decline on the new card without failing the request", async () => {
    mocks.invoicesPay.mockRejectedValue(new mocks.StripeCardError("Your card was declined."));

    const reply = replyStub();
    await retryPayment(requestStub("u_owner", { organizationId: "org_1" }), reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.body).toEqual({ status: "failed" });
    // The new card stays on the subscription for Stripe's own retries.
    expect(mocks.subscriptionsUpdate).toHaveBeenCalled();
  });

  it("charges nothing when the card has not changed", async () => {
    mocks.customersRetrieve.mockResolvedValue({ invoice_settings: { default_payment_method: "pm_old" } });

    const reply = replyStub();
    await retryPayment(requestStub("u_owner", { organizationId: "org_1" }), reply);

    expect(reply.body).toEqual({ status: "unchanged" });
    expect(mocks.subscriptionsUpdate).not.toHaveBeenCalled();
    expect(mocks.invoicesPay).not.toHaveBeenCalled();
  });

  it("does nothing when no card subscription is past due", async () => {
    mocks.subscriptionsList.mockResolvedValue({ data: [pastDueSubscription({ collection_method: "send_invoice" })] });

    const reply = replyStub();
    await retryPayment(requestStub("u_owner", { organizationId: "org_1" }), reply);

    expect(reply.body).toEqual({ status: "none" });
    expect(mocks.customersRetrieve).not.toHaveBeenCalled();
    expect(mocks.invoicesPay).not.toHaveBeenCalled();
  });

  it("rejects members who can't manage billing before touching Stripe", async () => {
    const reply = replyStub();
    await retryPayment(requestStub("u_member", { organizationId: "org_1" }), reply);

    expect(reply.statusCode).toBe(403);
    expect(mocks.subscriptionsList).not.toHaveBeenCalled();
  });

  it("answers 500 when Stripe fails for a reason other than the card", async () => {
    mocks.invoicesPay.mockRejectedValue(new Error("Stripe is down"));

    const reply = replyStub();
    await retryPayment(requestStub("u_owner", { organizationId: "org_1" }), reply);

    expect(reply.statusCode).toBe(500);
    expect(mocks.requestOrganizationRefresh).not.toHaveBeenCalled();
  });
});
