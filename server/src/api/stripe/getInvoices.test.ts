import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invoicesList: vi.fn(),
}));

vi.mock("../../lib/stripe.js", () => ({
  stripe: {
    invoices: { list: mocks.invoicesList },
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
import { getInvoices } from "./getInvoices.js";

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

function requestStub(userId: string | undefined, query: Record<string, unknown>) {
  return { user: userId ? { id: userId } : undefined, query } as any;
}

const fakeInvoice = {
  id: "in_1",
  number: "ACME-0001",
  status: "paid",
  amount_due: 4900,
  amount_paid: 4900,
  currency: "usd",
  created: 1751000000,
  period_start: 1751000000,
  period_end: 1753600000,
  hosted_invoice_url: "https://invoice.stripe.com/i/in_1",
  invoice_pdf: "https://invoice.stripe.com/i/in_1/pdf",
  // Extra Stripe fields that must NOT leak through the mapping:
  customer: "cus_1",
  default_payment_method: "pm_secret",
};

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
  mocks.invoicesList.mockResolvedValue({ data: [fakeInvoice] });
});

const expectedMappedInvoice = {
  id: "in_1",
  number: "ACME-0001",
  status: "paid",
  amountDue: 4900,
  amountPaid: 4900,
  currency: "usd",
  created: 1751000000,
  periodStart: 1751000000,
  periodEnd: 1753600000,
  hostedInvoiceUrl: "https://invoice.stripe.com/i/in_1",
  invoicePdf: "https://invoice.stripe.com/i/in_1/pdf",
};

describe("getInvoices — authorization", () => {
  it("returns mapped invoices for the org owner", async () => {
    const reply = replyStub();

    await getInvoices(requestStub("u_owner", { organizationId: "org_1" }), reply);

    expect(reply.statusCode).toBe(200);
    expect(mocks.invoicesList).toHaveBeenCalledWith({ customer: "cus_1", limit: 100 });
    expect(reply.body).toEqual([expectedMappedInvoice]);
  });

  it("rejects a non-owner member with 403 and never calls Stripe", async () => {
    // Invoices carry unauthenticated Stripe hosted/PDF URLs, so this read is
    // owner-only like the other five billing routes.
    const reply = replyStub();

    await getInvoices(requestStub("u_member", { organizationId: "org_1" }), reply);

    expect(reply.statusCode).toBe(403);
    expect(reply.body.error).toBe("Only organization owners can manage billing");
    expect(mocks.invoicesList).not.toHaveBeenCalled();
  });

  it("rejects a user with no membership in the target org (cross-org attempt)", async () => {
    const reply = replyStub();

    // u_outsider owns org_2 but must not read org_1's invoices.
    await getInvoices(requestStub("u_outsider", { organizationId: "org_1" }), reply);

    expect(reply.statusCode).toBe(403);
    expect(reply.body.error).toBe("Only organization owners can manage billing");
    expect(mocks.invoicesList).not.toHaveBeenCalled();
  });

  it("returns 401 when there is no authenticated user", async () => {
    const reply = replyStub();

    await getInvoices(requestStub(undefined, { organizationId: "org_1" }), reply);

    expect(reply.statusCode).toBe(401);
    expect(mocks.invoicesList).not.toHaveBeenCalled();
  });

  it("returns 400 when organizationId is missing", async () => {
    const reply = replyStub();

    await getInvoices(requestStub("u_owner", {}), reply);

    expect(reply.statusCode).toBe(400);
    expect(reply.body.error).toBe("Organization ID is required");
    expect(mocks.invoicesList).not.toHaveBeenCalled();
  });
});

describe("getInvoices — Stripe customer handling", () => {
  it("returns an empty list without calling Stripe when the org has no customer ID", async () => {
    await (sql as any).exec(`UPDATE "organization" SET "stripeCustomerId" = NULL WHERE "id" = 'org_1'`);
    const reply = replyStub();

    await getInvoices(requestStub("u_owner", { organizationId: "org_1" }), reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.body).toEqual([]);
    expect(mocks.invoicesList).not.toHaveBeenCalled();
  });

  it("returns 500 when the Stripe API fails", async () => {
    mocks.invoicesList.mockRejectedValue(new Error("stripe down"));
    const reply = replyStub();

    await getInvoices(requestStub("u_owner", { organizationId: "org_1" }), reply);

    expect(reply.statusCode).toBe(500);
    expect(reply.body.error).toBe("Failed to fetch invoices");
  });
});
