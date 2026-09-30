import type { PGlite } from "@electric-sql/pglite";
import type { FastifyReply, FastifyRequest } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_linkage_test";
  return { previousSecret, constructEvent: vi.fn(), refresh: vi.fn() };
});
vi.mock("../../lib/stripe.js", () => ({ stripe: { webhooks: { constructEvent: mocks.constructEvent } } }));
vi.mock("../../lib/subscriptionUtils.js", () => ({ invalidateStripeSubscriptionCache: vi.fn() }));
vi.mock("../../services/usageService.js", () => ({ usageService: { requestOrganizationRefresh: mocks.refresh } }));
vi.mock("../../db/postgres/postgres.js", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("../../db/postgres/schema.js");
  const client = new PGlite();
  return { db: drizzle(client, { schema }), sql: client };
});

import { sql } from "../../db/postgres/postgres.js";
import { handleWebhook } from "./webhook.js";

const client = sql as unknown as PGlite;
beforeAll(async () => {
  await client.exec('CREATE TABLE organization (id text PRIMARY KEY, "stripeCustomerId" text)');
});
beforeEach(async () => {
  vi.clearAllMocks();
  await client.exec("TRUNCATE organization");
  mocks.constructEvent.mockReturnValue({
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_old",
        mode: "subscription",
        customer: "cus_old",
        metadata: { organizationId: "org_1" },
      },
    },
  });
});
afterAll(async () => {
  if (mocks.previousSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
  else process.env.STRIPE_WEBHOOK_SECRET = mocks.previousSecret;
  await client.close();
});

async function completeCheckout() {
  const request = {
    headers: { "stripe-signature": "test" },
    raw: { body: "raw" },
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as FastifyRequest;
  const reply = { status: vi.fn(), send: vi.fn() };
  reply.status.mockReturnValue(reply);
  await handleWebhook(request, reply as unknown as FastifyReply);
  expect(reply.send).toHaveBeenCalledWith({ received: true });
  const result = await client.query<{ stripeCustomerId: string | null }>(
    'SELECT "stripeCustomerId" FROM organization WHERE id = $1',
    ["org_1"]
  );
  return result.rows[0].stripeCustomerId;
}

describe("Stripe checkout canonical linkage", () => {
  it("never replaces a newer canonical customer with a late checkout completion", async () => {
    await client.exec("INSERT INTO organization VALUES ('org_1', 'cus_new')");
    expect(await completeCheckout()).toBe("cus_new");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("links an organization with no customer", async () => {
    await client.exec("INSERT INTO organization VALUES ('org_1', NULL)");
    expect(await completeCheckout()).toBe("cus_old");
    expect(mocks.refresh).toHaveBeenCalledWith("org_1");
  });
  it("preserves and refreshes the matching canonical customer on redelivery", async () => {
    await client.exec("INSERT INTO organization VALUES ('org_1', 'cus_old')");
    expect(await completeCheckout()).toBe("cus_old");
    expect(mocks.refresh).toHaveBeenCalledWith("org_1");
  });
});
