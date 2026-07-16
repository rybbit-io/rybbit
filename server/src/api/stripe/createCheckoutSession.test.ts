import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  customersCreate: vi.fn(),
  checkoutSessionsCreate: vi.fn(),
}));

vi.mock("../../lib/stripe.js", () => ({
  stripe: {
    customers: { create: mocks.customersCreate },
    checkout: { sessions: { create: mocks.checkoutSessionsCreate } },
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
import { createCheckoutSession } from "./createCheckoutSession.js";

const DDL = `
CREATE TABLE "organization" ("id" text PRIMARY KEY, "name" text NOT NULL, "slug" text, "createdAt" timestamp DEFAULT now(), "stripeCustomerId" text);
CREATE TABLE "user" ("id" text PRIMARY KEY, "name" text, "email" text, "createdAt" timestamp DEFAULT now());
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

async function orgCustomerId(orgId: string): Promise<string | null> {
  const result = await (sql as any).query(`SELECT "stripeCustomerId" FROM "organization" WHERE "id" = $1`, [orgId]);
  return result.rows[0]?.stripeCustomerId ?? null;
}

const validBody = { priceId: "price_pro", returnUrl: "https://app.rybbit.io/billing", organizationId: "org_1" };

beforeAll(async () => {
  await (sql as any).exec(DDL);
});

beforeEach(async () => {
  vi.clearAllMocks();
  await (sql as any).exec(`TRUNCATE "organization", "user", "member"`);
  await (sql as any).exec(`
    INSERT INTO "organization" ("id","name","slug","stripeCustomerId") VALUES
      ('org_1','Acme','acme','cus_1'),
      ('org_2','Rival','rival','cus_2');
    INSERT INTO "user" ("id","name","email") VALUES
      ('u_owner','Owner','owner@acme.com'),
      ('u_member','Member','member@acme.com'),
      ('u_outsider','Outsider','outsider@rival.com');
    INSERT INTO "member" ("id","organizationId","userId","role") VALUES
      ('m_owner','org_1','u_owner','owner'),
      ('m_member','org_1','u_member','member'),
      ('m_outsider','org_2','u_outsider','owner');
  `);
  mocks.customersCreate.mockResolvedValue({ id: "cus_new" });
  mocks.checkoutSessionsCreate.mockResolvedValue({ client_secret: "cs_secret_123" });
});

describe("createCheckoutSession — authorization", () => {
  it("creates a checkout session for the org owner with metadata.organizationId from the authorized org", async () => {
    const reply = replyStub();

    await createCheckoutSession(requestStub("u_owner", validBody), reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.body).toEqual({ clientSecret: "cs_secret_123" });
    // metadata.organizationId is what the webhook later trusts — it must be the org
    // the membership check authorized, not anything attacker-controlled.
    expect(mocks.checkoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        ui_mode: "embedded",
        customer: "cus_1",
        line_items: [{ price: "price_pro", quantity: 1 }],
        return_url: "https://app.rybbit.io/billing",
        metadata: { organizationId: "org_1" },
        subscription_data: { trial_period_days: 7 },
      })
    );
    // Org already had a Stripe customer — no new customer, no DB write.
    expect(mocks.customersCreate).not.toHaveBeenCalled();
    expect(await orgCustomerId("org_1")).toBe("cus_1");
  });

  it("rejects a non-owner member with 403 and creates nothing", async () => {
    const reply = replyStub();

    await createCheckoutSession(requestStub("u_member", validBody), reply);

    expect(reply.statusCode).toBe(403);
    expect(reply.body.error).toBe("Only organization owners can manage billing");
    expect(mocks.customersCreate).not.toHaveBeenCalled();
    expect(mocks.checkoutSessionsCreate).not.toHaveBeenCalled();
  });

  it("rejects a user with no membership in the target org (cross-org attempt)", async () => {
    const reply = replyStub();

    // u_outsider owns org_2 but must not be able to start checkout for org_1.
    await createCheckoutSession(requestStub("u_outsider", validBody), reply);

    expect(reply.statusCode).toBe(403);
    expect(mocks.customersCreate).not.toHaveBeenCalled();
    expect(mocks.checkoutSessionsCreate).not.toHaveBeenCalled();
    expect(await orgCustomerId("org_1")).toBe("cus_1");
  });

  it("returns 401 when there is no authenticated user", async () => {
    const reply = replyStub();

    await createCheckoutSession(requestStub(undefined, validBody), reply);

    expect(reply.statusCode).toBe(401);
    expect(mocks.checkoutSessionsCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when priceId, returnUrl or organizationId is missing", async () => {
    for (const omit of ["priceId", "returnUrl", "organizationId"] as const) {
      const body: Record<string, unknown> = { ...validBody };
      delete body[omit];
      const reply = replyStub();
      await createCheckoutSession(requestStub("u_owner", body), reply);
      expect(reply.statusCode).toBe(400);
      expect(reply.body.error).toContain("Missing required parameters");
    }
    expect(mocks.checkoutSessionsCreate).not.toHaveBeenCalled();
  });
});

describe("createCheckoutSession — customer creation and referral wiring", () => {
  it("creates a Stripe customer and persists it when the org has none", async () => {
    await (sql as any).exec(`UPDATE "organization" SET "stripeCustomerId" = NULL WHERE "id" = 'org_1'`);
    const reply = replyStub();

    await createCheckoutSession(requestStub("u_owner", validBody), reply);

    expect(reply.statusCode).toBe(200);
    expect(mocks.customersCreate).toHaveBeenCalledWith({
      email: "owner@acme.com",
      name: "Acme",
      metadata: { organizationId: "org_1", createdByUserId: "u_owner" },
    });
    expect(await orgCustomerId("org_1")).toBe("cus_new");
    expect(mocks.checkoutSessionsCreate).toHaveBeenCalledWith(expect.objectContaining({ customer: "cus_new" }));
  });

  it("threads the referral through customer metadata and client_reference_id", async () => {
    await (sql as any).exec(`UPDATE "organization" SET "stripeCustomerId" = NULL WHERE "id" = 'org_1'`);
    const reply = replyStub();

    await createCheckoutSession(requestStub("u_owner", { ...validBody, referral: "ref_abc" }), reply);

    expect(mocks.customersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ referral: "ref_abc" }) })
    );
    expect(mocks.checkoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ client_reference_id: "ref_abc" })
    );
  });

  it("returns 404 when the organization does not exist", async () => {
    // Membership row without a matching organization row.
    await (sql as any).exec(
      `INSERT INTO "member" ("id","organizationId","userId","role") VALUES ('m_ghost','org_ghost','u_owner','owner')`
    );
    const reply = replyStub();

    await createCheckoutSession(requestStub("u_owner", { ...validBody, organizationId: "org_ghost" }), reply);

    expect(reply.statusCode).toBe(404);
    expect(mocks.checkoutSessionsCreate).not.toHaveBeenCalled();
  });
});
