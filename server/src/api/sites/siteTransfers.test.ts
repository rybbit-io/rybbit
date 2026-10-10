import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ isCloud: false, siteLimit: null as number | null }));
const mocks = vi.hoisted(() => ({
  sendSiteTransferEmail: vi.fn(async () => {}),
  invalidateSitesAccessCache: vi.fn(),
  invalidateOrganizationSitesCache: vi.fn(),
}));

vi.mock("../../db/postgres/postgres.js", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("../../db/postgres/schema.js");
  const client = new PGlite();
  return { db: drizzle(client, { schema }), sql: client };
});
vi.mock("../../lib/auth-utils.js", () => ({
  invalidateSitesAccessCache: mocks.invalidateSitesAccessCache,
  invalidateOrganizationSitesCache: mocks.invalidateOrganizationSitesCache,
  getIsUserAdmin: vi.fn(async () => false),
}));
vi.mock("../../lib/email/email.js", () => ({ sendSiteTransferEmail: mocks.sendSiteTransferEmail }));
vi.mock("../../lib/const.js", async importOriginal => ({
  ...(await importOriginal<typeof import("../../lib/const.js")>()),
  get IS_CLOUD() {
    return state.isCloud;
  },
}));
vi.mock("../stripe/getSubscription.js", () => ({
  getSubscriptionInner: vi.fn(async () => ({ siteLimit: state.siteLimit })),
}));

import { sql as pgClient } from "../../db/postgres/postgres.js";
import {
  acceptSiteTransfer,
  cancelSiteTransfer,
  createSiteTransfer,
  declineSiteTransfer,
  getIncomingSiteTransfer,
  getSiteTransfer,
} from "./siteTransfers.js";

// Only the columns these handlers and applySiteMove touch.
const DDL = `
CREATE TABLE "organization" ("id" text PRIMARY KEY, "name" text NOT NULL);
CREATE TABLE "user" ("id" text PRIMARY KEY, "email" text NOT NULL, "emailVerified" boolean NOT NULL DEFAULT false);
CREATE TABLE "sites" (
  "site_id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "domain" text NOT NULL,
  "organization_id" text REFERENCES "organization"("id"),
  "updated_at" timestamp
);
CREATE TABLE "member" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL,
  "userId" text NOT NULL,
  "role" text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "has_restricted_site_access" boolean NOT NULL DEFAULT false
);
CREATE TABLE "member_site_access" ("id" serial PRIMARY KEY, "member_id" text NOT NULL, "site_id" integer NOT NULL);
CREATE TABLE "team_site_access" ("id" serial PRIMARY KEY, "team_id" text NOT NULL, "site_id" integer NOT NULL);
CREATE TABLE "segments" ("segment_id" serial PRIMARY KEY, "organization_id" text NOT NULL, "site_id" integer);
CREATE TABLE "annotations" ("id" serial PRIMARY KEY, "organization_id" text NOT NULL, "site_id" integer);
CREATE TABLE "import_status" ("import_id" text PRIMARY KEY, "organization_id" text NOT NULL, "site_id" integer NOT NULL);
CREATE TABLE "gsc_connections" ("site_id" integer PRIMARY KEY, "access_token" text NOT NULL);
CREATE TABLE "site_transfers" (
  "id" text PRIMARY KEY,
  "site_id" integer NOT NULL UNIQUE REFERENCES "sites"("site_id") ON DELETE CASCADE,
  "source_organization_id" text NOT NULL,
  "recipient_email" text NOT NULL,
  "created_by" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "expires_at" timestamp NOT NULL
);
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

const request = (overrides: Record<string, unknown> = {}) =>
  ({ params: {}, body: {}, user: { id: "barnaby" }, log: { error: vi.fn() }, ...overrides }) as any;

async function rows(query: string) {
  return (await (pgClient as any).query(query)).rows;
}

async function startTransfer(email = "tay@example.org") {
  const reply = replyStub();
  await createSiteTransfer(request({ params: { siteId: "1" }, body: { email } }), reply);
  return reply;
}

beforeAll(async () => {
  await (pgClient as any).exec(DDL);
});

afterAll(async () => {
  await (pgClient as any).close();
});

beforeEach(async () => {
  vi.clearAllMocks();
  state.isCloud = false;
  state.siteLimit = null;
  await (pgClient as any).exec(`
    TRUNCATE "site_transfers", "gsc_connections", "import_status", "annotations", "segments",
      "team_site_access", "member_site_access", "member", "sites", "user", "organization" RESTART IDENTITY;
    INSERT INTO "organization" VALUES ('org_agency', 'Parcero'), ('org_client', 'TAY'), ('org_other', 'Other');
    INSERT INTO "user" VALUES
      ('barnaby', 'barnaby@agency.io', true), ('tay', 'Tay@Example.org', true), ('mallory', 'mallory@evil.io', true);
    INSERT INTO "sites" ("name", "domain", "organization_id") VALUES ('TAY', 'tay.example.org', 'org_agency');
    INSERT INTO "member" ("id", "organizationId", "userId", "role") VALUES
      ('m_barnaby', 'org_agency', 'barnaby', 'owner'),
      ('m_tay_client', 'org_client', 'tay', 'owner'),
      ('m_tay_other', 'org_other', 'tay', 'member'),
      ('m_tay_agency', 'org_agency', 'tay', 'viewer');
    INSERT INTO "member_site_access" ("member_id", "site_id") VALUES ('m_tay_agency', 1);
    INSERT INTO "segments" ("organization_id", "site_id") VALUES ('org_agency', 1), ('org_agency', NULL);
    INSERT INTO "annotations" ("organization_id", "site_id") VALUES ('org_agency', 1), ('org_agency', NULL);
    INSERT INTO "import_status" VALUES ('imp_1', 'org_agency', 1);
    INSERT INTO "gsc_connections" VALUES (1, 'barnabys-google-token');
  `);
});

describe("starting a transfer", () => {
  it("records one pending transfer, emails the recipient and returns the link", async () => {
    const reply = await startTransfer("  Tay@Example.org ");

    expect(reply.statusCode).toBe(201);
    expect(reply.body).toMatchObject({ recipientEmail: "tay@example.org", url: expect.stringContaining("/transfer/") });
    expect(mocks.sendSiteTransferEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: "tay@example.org", sentBy: "barnaby@agency.io", siteDomain: "tay.example.org" })
    );
    expect(await rows(`SELECT site_id, source_organization_id, created_by FROM site_transfers`)).toEqual([
      { site_id: 1, source_organization_id: "org_agency", created_by: "barnaby" },
    ]);
  });

  it("replaces the previous transfer, revoking its link", async () => {
    const first = await startTransfer("first@example.org");
    await startTransfer("tay@example.org");

    expect(await rows(`SELECT id, recipient_email FROM site_transfers`)).toEqual([
      { id: expect.not.stringMatching(first.body.id), recipient_email: "tay@example.org" },
    ]);
  });

  it("still returns the link when the email cannot be sent", async () => {
    mocks.sendSiteTransferEmail.mockRejectedValueOnce(new Error("no email on this instance"));

    const reply = await startTransfer();

    expect(reply.statusCode).toBe(201);
    expect(reply.body.url).toContain(reply.body.id);
  });

  it("re-checks the sender against the organization the site is in now", async () => {
    // The site was handed to org_client after the sender's request passed the
    // guard: the sender has no role there, so they can't send it anywhere.
    await (pgClient as any).exec(`UPDATE sites SET organization_id = 'org_client'`);

    const reply = await startTransfer("barnaby@agency.io");

    expect(reply.statusCode).toBe(403);
    expect(await rows(`SELECT * FROM site_transfers`)).toEqual([]);
  });

  it("refuses organization keys, which act for no person", async () => {
    const reply = replyStub();
    await createSiteTransfer(
      request({ params: { siteId: "1" }, body: { email: "tay@example.org" }, user: undefined }),
      reply
    );

    expect(reply.statusCode).toBe(401);
  });

  it("shows and cancels the pending transfer", async () => {
    await startTransfer();

    const shown = replyStub();
    await getSiteTransfer(request({ params: { siteId: "1" } }), shown);
    expect(shown.body.transfer).toMatchObject({ recipientEmail: "tay@example.org" });

    await cancelSiteTransfer(request({ params: { siteId: "1" } }), replyStub());
    const after = replyStub();
    await getSiteTransfer(request({ params: { siteId: "1" } }), after);
    expect(after.body).toEqual({ transfer: null });
  });
});

describe("the recipient", () => {
  it("sees the offer only from the account it was sent to (email compared case-insensitively)", async () => {
    const { body } = await startTransfer();

    const asTay = replyStub();
    await getIncomingSiteTransfer(request({ params: { transferId: body.id }, user: { id: "tay" } }), asTay);
    expect(asTay.statusCode).toBe(200);
    expect(asTay.body).toMatchObject({
      site: { siteId: 1, domain: "tay.example.org" },
      sourceOrganizationName: "Parcero",
      sentBy: "barnaby@agency.io",
    });

    const asMallory = replyStub();
    await getIncomingSiteTransfer(request({ params: { transferId: body.id }, user: { id: "mallory" } }), asMallory);
    expect(asMallory.statusCode).toBe(403);
    // Enough to tell them which account to use, not enough to register it.
    expect(asMallory.body).toMatchObject({ reason: "wrong_account", recipientEmailHint: "t••@example.org" });
    expect(JSON.stringify(asMallory.body)).not.toContain("tay@example.org");

    const signedOut = replyStub();
    await getIncomingSiteTransfer(request({ params: { transferId: body.id }, user: undefined }), signedOut);
    expect(signedOut.statusCode).toBe(401);
  });

  it("moves the site, its own segments, annotations and imports into their organization", async () => {
    const { body } = await startTransfer();
    const reply = replyStub();

    await acceptSiteTransfer(
      request({ params: { transferId: body.id }, body: { organizationId: "org_client" }, user: { id: "tay" } }),
      reply
    );

    expect(reply.statusCode).toBe(200);
    expect(await rows(`SELECT organization_id FROM sites`)).toEqual([{ organization_id: "org_client" }]);
    expect(await rows(`SELECT organization_id FROM segments ORDER BY site_id NULLS LAST`)).toEqual([
      { organization_id: "org_client" },
      { organization_id: "org_agency" },
    ]);
    expect(await rows(`SELECT organization_id FROM annotations ORDER BY site_id NULLS LAST`)).toEqual([
      { organization_id: "org_client" },
      { organization_id: "org_agency" },
    ]);
    expect(await rows(`SELECT organization_id FROM import_status`)).toEqual([{ organization_id: "org_client" }]);
    // Access granted by the old organization, the transfer itself, and the
    // sender's Search Console credentials all stay behind.
    expect(await rows(`SELECT * FROM member_site_access`)).toEqual([]);
    expect(await rows(`SELECT * FROM site_transfers`)).toEqual([]);
    expect(await rows(`SELECT * FROM gsc_connections`)).toEqual([]);
    // Organization keys of both sides stop seeing the old site list.
    expect(mocks.invalidateOrganizationSitesCache).toHaveBeenCalledWith("org_agency");
    expect(mocks.invalidateOrganizationSitesCache).toHaveBeenCalledWith("org_client");
  });

  it("can only move the site into an organization they administer", async () => {
    const { body } = await startTransfer();
    const reply = replyStub();

    await acceptSiteTransfer(
      request({ params: { transferId: body.id }, body: { organizationId: "org_other" }, user: { id: "tay" } }),
      reply
    );

    expect(reply.statusCode).toBe(403);
    expect(await rows(`SELECT organization_id FROM sites`)).toEqual([{ organization_id: "org_agency" }]);
  });

  it("cannot be accepted by anyone else holding the link", async () => {
    const { body } = await startTransfer();
    await (pgClient as any).exec(
      `INSERT INTO "member" ("id", "organizationId", "userId", "role") VALUES ('m_mallory', 'org_other', 'mallory', 'owner')`
    );
    const reply = replyStub();

    await acceptSiteTransfer(
      request({ params: { transferId: body.id }, body: { organizationId: "org_other" }, user: { id: "mallory" } }),
      reply
    );

    expect(reply.statusCode).toBe(403);
    expect(await rows(`SELECT organization_id FROM sites`)).toEqual([{ organization_id: "org_agency" }]);
  });

  it("on cloud, needs the recipient's address to be verified", async () => {
    state.isCloud = true;
    const { body } = await startTransfer();
    await (pgClient as any).exec(`UPDATE "user" SET "emailVerified" = false WHERE id = 'tay'`);
    const reply = replyStub();

    await acceptSiteTransfer(
      request({ params: { transferId: body.id }, body: { organizationId: "org_client" }, user: { id: "tay" } }),
      reply
    );

    expect(reply.statusCode).toBe(403);
    expect(reply.body).toMatchObject({ reason: "email_unverified" });
    expect(await rows(`SELECT organization_id FROM sites`)).toEqual([{ organization_id: "org_agency" }]);
  });

  it("lets only one of two concurrent accepts move the site", async () => {
    const { body } = await startTransfer();
    await (pgClient as any).exec(
      `INSERT INTO "member" ("id", "organizationId", "userId", "role") VALUES ('m_tay_other_owner', 'org_other', 'tay', 'owner')
       ON CONFLICT DO NOTHING; UPDATE "member" SET role = 'owner' WHERE id = 'm_tay_other'`
    );
    const accept = (organizationId: string) => {
      const reply = replyStub();
      return acceptSiteTransfer(
        request({ params: { transferId: body.id }, body: { organizationId }, user: { id: "tay" } }),
        reply
      ).then(() => reply);
    };

    const replies = await Promise.all([accept("org_client"), accept("org_other")]);

    expect(replies.map(reply => reply.statusCode).sort()).toEqual([200, 404]);
    const winner = replies.find(reply => reply.statusCode === 200)!.body.organizationId;
    expect(await rows(`SELECT organization_id FROM sites`)).toEqual([{ organization_id: winner }]);
  });

  it("is refused once the site has moved by other means", async () => {
    const { body } = await startTransfer();
    await (pgClient as any).exec(`UPDATE sites SET organization_id = 'org_other'`);
    const reply = replyStub();

    await acceptSiteTransfer(
      request({ params: { transferId: body.id }, body: { organizationId: "org_client" }, user: { id: "tay" } }),
      reply
    );

    expect(reply.statusCode).toBe(409);
    expect(await rows(`SELECT organization_id FROM sites`)).toEqual([{ organization_id: "org_other" }]);
  });

  it("is refused after the link expires", async () => {
    const { body } = await startTransfer();
    await (pgClient as any).exec(`UPDATE site_transfers SET expires_at = now() - interval '1 minute'`);
    const reply = replyStub();

    await acceptSiteTransfer(
      request({ params: { transferId: body.id }, body: { organizationId: "org_client" }, user: { id: "tay" } }),
      reply
    );

    expect(reply.statusCode).toBe(404);
  });

  it("respects the receiving organization's site limit on cloud", async () => {
    state.isCloud = true;
    state.siteLimit = 0;
    const { body } = await startTransfer();
    const reply = replyStub();

    await acceptSiteTransfer(
      request({ params: { transferId: body.id }, body: { organizationId: "org_client" }, user: { id: "tay" } }),
      reply
    );

    expect(reply.statusCode).toBe(403);
    expect(await rows(`SELECT organization_id FROM sites`)).toEqual([{ organization_id: "org_agency" }]);
    expect(await rows(`SELECT count(*)::int AS n FROM site_transfers`)).toEqual([{ n: 1 }]);
  });

  it("can decline, which removes the transfer", async () => {
    const { body } = await startTransfer();

    await declineSiteTransfer(request({ params: { transferId: body.id }, user: { id: "tay" } }), replyStub());

    expect(await rows(`SELECT * FROM site_transfers`)).toEqual([]);
    expect(await rows(`SELECT organization_id FROM sites`)).toEqual([{ organization_id: "org_agency" }]);
  });
});
