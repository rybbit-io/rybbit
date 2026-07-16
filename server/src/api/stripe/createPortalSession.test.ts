import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  subscriptionsList: vi.fn(),
  portalSessionsCreate: vi.fn(),
}));

vi.mock("../../lib/stripe.js", () => ({
  stripe: {
    subscriptions: { list: mocks.subscriptionsList },
    billingPortal: { sessions: { create: mocks.portalSessionsCreate } },
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
import { createPortalSession } from "./createPortalSession.js";

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

const validBody = { returnUrl: "https://app.rybbit.io/settings/billing", organizationId: "org_1" };

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
    status === "active" ? { data: [{ id: "sub_1", cancel_at_period_end: false }] } : { data: [] }
  );
  mocks.portalSessionsCreate.mockResolvedValue({ url: "https://billing.stripe.com/session/xyz" });
});

describe("createPortalSession — authorization", () => {
  it("creates a plain portal session for the org owner with the requested return URL", async () => {
    const reply = replyStub();

    await createPortalSession(requestStub("u_owner", validBody), reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.body).toEqual({ portalUrl: "https://billing.stripe.com/session/xyz" });
    expect(mocks.portalSessionsCreate).toHaveBeenCalledWith({
      customer: "cus_1",
      return_url: "https://app.rybbit.io/settings/billing",
    });
  });

  it("rejects a non-owner member with 403 and never opens a portal", async () => {
    const reply = replyStub();

    await createPortalSession(requestStub("u_member", validBody), reply);

    expect(reply.statusCode).toBe(403);
    expect(reply.body.error).toBe("Only organization owners can manage billing");
    expect(mocks.portalSessionsCreate).not.toHaveBeenCalled();
    expect(mocks.subscriptionsList).not.toHaveBeenCalled();
  });

  it("rejects a user with no membership in the target org (cross-org attempt)", async () => {
    const reply = replyStub();

    // u_outsider owns org_2 but must not reach org_1's billing portal (cus_1).
    await createPortalSession(requestStub("u_outsider", validBody), reply);

    expect(reply.statusCode).toBe(403);
    expect(mocks.portalSessionsCreate).not.toHaveBeenCalled();
  });

  it("returns 401 when there is no authenticated user", async () => {
    const reply = replyStub();

    await createPortalSession(requestStub(undefined, validBody), reply);

    expect(reply.statusCode).toBe(401);
    expect(mocks.portalSessionsCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when returnUrl or organizationId is missing", async () => {
    for (const body of [{ organizationId: "org_1" }, { returnUrl: "https://x.dev" }, {}]) {
      const reply = replyStub();
      await createPortalSession(requestStub("u_owner", body), reply);
      expect(reply.statusCode).toBe(400);
      expect(reply.body.error).toContain("Missing required parameters");
    }
    expect(mocks.portalSessionsCreate).not.toHaveBeenCalled();
  });

  it("returns 404 when the org has no Stripe customer ID", async () => {
    await (sql as any).exec(`UPDATE "organization" SET "stripeCustomerId" = NULL WHERE "id" = 'org_1'`);
    const reply = replyStub();

    await createPortalSession(requestStub("u_owner", validBody), reply);

    expect(reply.statusCode).toBe(404);
    expect(mocks.portalSessionsCreate).not.toHaveBeenCalled();
  });
});

describe("createPortalSession — flow types", () => {
  it("targets the active subscription for the subscription_update flow", async () => {
    const reply = replyStub();

    await createPortalSession(requestStub("u_owner", { ...validBody, flowType: "subscription_update" }), reply);

    expect(reply.statusCode).toBe(200);
    expect(mocks.portalSessionsCreate).toHaveBeenCalledWith({
      customer: "cus_1",
      return_url: validBody.returnUrl,
      flow_data: { type: "subscription_update", subscription_update: { subscription: "sub_1" } },
    });
  });

  it("falls back to the trialing subscription when no active one exists", async () => {
    mocks.subscriptionsList.mockImplementation(async ({ status }: any) =>
      status === "trialing" ? { data: [{ id: "sub_trial", cancel_at_period_end: false }] } : { data: [] }
    );
    const reply = replyStub();

    await createPortalSession(requestStub("u_owner", { ...validBody, flowType: "subscription_update" }), reply);

    expect(mocks.portalSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        flow_data: { type: "subscription_update", subscription_update: { subscription: "sub_trial" } },
      })
    );
  });

  it("returns 404 for subscription_update when no subscription exists at all", async () => {
    mocks.subscriptionsList.mockResolvedValue({ data: [] });
    const reply = replyStub();

    await createPortalSession(requestStub("u_owner", { ...validBody, flowType: "subscription_update" }), reply);

    expect(reply.statusCode).toBe(404);
    expect(reply.body.error).toBe("No active subscription found");
    expect(mocks.portalSessionsCreate).not.toHaveBeenCalled();
  });

  it("attaches the subscription_cancel flow for a subscription not yet set to cancel", async () => {
    const reply = replyStub();

    await createPortalSession(requestStub("u_owner", { ...validBody, flowType: "subscription_cancel" }), reply);

    expect(mocks.portalSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        flow_data: { type: "subscription_cancel", subscription_cancel: { subscription: "sub_1" } },
      })
    );
  });

  it("opens the plain portal when the subscription is already set to cancel at period end", async () => {
    mocks.subscriptionsList.mockImplementation(async ({ status }: any) =>
      status === "active" ? { data: [{ id: "sub_1", cancel_at_period_end: true }] } : { data: [] }
    );
    const reply = replyStub();

    await createPortalSession(requestStub("u_owner", { ...validBody, flowType: "subscription_cancel" }), reply);

    expect(reply.statusCode).toBe(200);
    // No flow_data — Stripe rejects a cancel flow for an already-cancelling subscription.
    expect(mocks.portalSessionsCreate).toHaveBeenCalledWith({
      customer: "cus_1",
      return_url: validBody.returnUrl,
    });
  });

  it("attaches the payment_method_update flow without needing a subscription lookup", async () => {
    const reply = replyStub();

    await createPortalSession(requestStub("u_owner", { ...validBody, flowType: "payment_method_update" }), reply);

    expect(mocks.subscriptionsList).not.toHaveBeenCalled();
    expect(mocks.portalSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ flow_data: { type: "payment_method_update" } })
    );
  });
});
