import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Real Drizzle queries against PGlite so the inline membership check — the SOLE
// authorization gate on this route — and the feedback insert are exercised for real.
vi.mock("../../db/postgres/postgres.js", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("../../db/postgres/schema.js");
  const client = new PGlite();
  const db = drizzle(client, { schema });
  return { db, sql: client };
});

import { sql } from "../../db/postgres/postgres.js";
import { submitCancellationFeedback } from "./submitCancellationFeedback.js";

const DDL = `
CREATE TABLE "member" ("id" text PRIMARY KEY, "organizationId" text NOT NULL, "userId" text NOT NULL, "role" text NOT NULL, "createdAt" timestamp DEFAULT now());
CREATE TABLE "cancellation_feedback" (
  "id" serial PRIMARY KEY,
  "organization_id" text NOT NULL,
  "user_id" text NOT NULL,
  "reason" text NOT NULL,
  "reason_details" text,
  "retention_offer_shown" text,
  "retention_offer_accepted" boolean DEFAULT false,
  "outcome" text NOT NULL,
  "plan_name_at_cancellation" text,
  "monthly_event_count_at_cancellation" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
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

function requestStub(userId: string | undefined, body: Record<string, unknown>) {
  return { user: userId ? { id: userId } : undefined, body } as any;
}

async function feedbackRows(): Promise<any[]> {
  const result = await (sql as any).query(`SELECT * FROM "cancellation_feedback"`);
  return result.rows;
}

const validBody = { organizationId: "org_1", reason: "too_expensive", outcome: "cancelled" };

beforeAll(async () => {
  await (sql as any).exec(DDL);
});

beforeEach(async () => {
  vi.clearAllMocks();
  await (sql as any).exec(`TRUNCATE "member", "cancellation_feedback"`);
  await (sql as any).exec(`
    INSERT INTO "member" ("id","organizationId","userId","role") VALUES
      ('m_owner','org_1','u_owner','owner'),
      ('m_member','org_1','u_member','member'),
      ('m_outsider','org_2','u_outsider','owner');
  `);
});

describe("submitCancellationFeedback — authorization", () => {
  it("persists feedback for the org owner with the full payload", async () => {
    const reply = replyStub();

    await submitCancellationFeedback(
      requestStub("u_owner", {
        ...validBody,
        reasonDetails: "Migrating to self-hosted",
        retentionOfferShown: "discount_50",
        retentionOfferAccepted: true,
        planNameAtCancellation: "pro100k",
        monthlyEventCountAtCancellation: 42000,
      }),
      reply
    );

    expect(reply.statusCode).toBe(200);
    expect(reply.body).toEqual({ success: true });
    const rows = await feedbackRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      organization_id: "org_1",
      user_id: "u_owner",
      reason: "too_expensive",
      reason_details: "Migrating to self-hosted",
      retention_offer_shown: "discount_50",
      retention_offer_accepted: true,
      outcome: "cancelled",
      plan_name_at_cancellation: "pro100k",
      monthly_event_count_at_cancellation: 42000,
    });
  });

  it("defaults optional fields to null/false when omitted", async () => {
    const reply = replyStub();

    await submitCancellationFeedback(requestStub("u_owner", validBody), reply);

    expect(reply.statusCode).toBe(200);
    const rows = await feedbackRows();
    expect(rows[0]).toMatchObject({
      reason_details: null,
      retention_offer_shown: null,
      retention_offer_accepted: false,
      plan_name_at_cancellation: null,
      monthly_event_count_at_cancellation: null,
    });
  });

  it("rejects a non-owner member with 403 and writes nothing", async () => {
    const reply = replyStub();

    await submitCancellationFeedback(requestStub("u_member", validBody), reply);

    expect(reply.statusCode).toBe(403);
    expect(reply.body.error).toBe("Only organization owners can submit cancellation feedback");
    expect(await feedbackRows()).toHaveLength(0);
  });

  it("rejects a user with no membership in the target org (cross-org attempt)", async () => {
    const reply = replyStub();

    // u_outsider owns org_2 but must not write feedback rows attributed to org_1.
    await submitCancellationFeedback(requestStub("u_outsider", validBody), reply);

    expect(reply.statusCode).toBe(403);
    expect(await feedbackRows()).toHaveLength(0);
  });

  it("returns 401 when there is no authenticated user", async () => {
    const reply = replyStub();

    await submitCancellationFeedback(requestStub(undefined, validBody), reply);

    expect(reply.statusCode).toBe(401);
    expect(await feedbackRows()).toHaveLength(0);
  });

  it("returns 400 when organizationId, reason or outcome is missing", async () => {
    for (const omit of ["organizationId", "reason", "outcome"] as const) {
      const body: Record<string, unknown> = { ...validBody };
      delete body[omit];
      const reply = replyStub();
      await submitCancellationFeedback(requestStub("u_owner", body), reply);
      expect(reply.statusCode).toBe(400);
      expect(reply.body.error).toContain("Missing required parameters");
    }
    expect(await feedbackRows()).toHaveLength(0);
  });
});
