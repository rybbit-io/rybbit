import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  loggerInfo: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("../../db/postgres/postgres.js", () => ({
  db: { execute: mocks.execute },
}));

vi.mock("../../lib/const.js", () => ({
  IS_CLOUD: true,
}));

import { handleAppSumoWebhook } from "./webhook.js";

const dialect = new PgDialect();
const requestLogger: any = {
  debug: vi.fn(),
  error: mocks.loggerError,
  info: mocks.loggerInfo,
  warn: mocks.loggerWarn,
  child: vi.fn(),
};
requestLogger.child.mockReturnValue(requestLogger);

// Renders the drizzle sql`` object passed to db.execute on the nth call into
// { sql, params } so we can assert the intended statement and bind values.
function executedQuery(n: number) {
  return dialect.sqlToQuery(mocks.execute.mock.calls[n][0]);
}

function createRequest(body: Record<string, unknown>) {
  return { body, log: requestLogger } as any;
}

function createReply() {
  const reply: any = { statusCode: 200 };
  reply.status = vi.fn((code: number) => {
    reply.statusCode = code;
    return reply;
  });
  reply.send = vi.fn((payload: unknown) => {
    reply.payload = payload;
    return reply;
  });
  return reply;
}

async function invoke(body: Record<string, unknown>) {
  const reply = createReply();
  await handleAppSumoWebhook(createRequest(body), reply);
  return reply;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.APPSUMO_CLIENT_ID = "as_client_id";
  process.env.APPSUMO_CLIENT_SECRET = "as_client_secret";
  mocks.execute.mockResolvedValue([]);
});

describe("handleAppSumoWebhook — availability gate", () => {
  it("returns 503 without touching the db when AppSumo credentials are not configured", async () => {
    delete process.env.APPSUMO_CLIENT_ID;

    const reply = await invoke({ event: "purchase", license_key: "lic_1" });

    expect(reply.statusCode).toBe(503);
    expect(reply.payload).toEqual({ error: "AppSumo integration is not available" });
    expect(mocks.execute).not.toHaveBeenCalled();
  });
});

describe("handleAppSumoWebhook — test webhooks", () => {
  it.each([
    ["test flag", { test: true, event: "purchase", license_key: "lic_1" }],
    ["test event", { event: "test", license_key: "lic_1" }],
  ])("acknowledges a %s payload without any db access", async (_label, body) => {
    const reply = await invoke(body);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload).toEqual({ event: "test", success: true });
    expect(mocks.execute).not.toHaveBeenCalled();
  });
});

describe("handleAppSumoWebhook — payload validation", () => {
  // PINNED: validation failures are still acknowledged with HTTP 200 (with
  // success: false in the body) rather than a 4xx — the handler always acks.
  it("rejects a payload with a missing license_key before any db write", async () => {
    const reply = await invoke({ event: "purchase" });

    expect(reply.statusCode).toBe(200);
    expect(reply.payload).toEqual({
      event: "purchase",
      success: false,
      error: "Missing license_key in webhook payload",
    });
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("rejects a payload with a missing event before any db write", async () => {
    const reply = await invoke({ license_key: "lic_1" });

    expect(reply.statusCode).toBe(200);
    expect(reply.payload).toEqual({
      event: "unknown",
      success: false,
      error: "Missing event in webhook payload",
    });
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("rejects an unknown event type before any db write", async () => {
    const reply = await invoke({ event: "refund", license_key: "lic_1" });

    expect(reply.statusCode).toBe(200);
    expect(reply.payload).toEqual({
      event: "refund",
      success: false,
      error: "Invalid AppSumo event type",
    });
    expect(mocks.execute).not.toHaveBeenCalled();
  });
});

describe("handleAppSumoWebhook — audit trail", () => {
  it("logs every valid webhook to appsumo.webhook_events with the full payload", async () => {
    const body = { event: "deactivate", license_key: "lic_audit" };
    await invoke(body);

    const audit = executedQuery(0);
    expect(audit.sql).toContain("INSERT INTO appsumo.webhook_events");
    expect(audit.params).toEqual(["lic_audit", "deactivate", JSON.stringify(body)]);
  });

  it("acks with 200 + success:false when the db throws mid-processing", async () => {
    // PINNED: db failures are swallowed and acknowledged (200) so AppSumo will
    // not retry — the event is effectively lost apart from the error log.
    mocks.execute.mockRejectedValueOnce(new Error("connection refused"));

    const reply = await invoke({ event: "deactivate", license_key: "lic_err" });

    expect(reply.statusCode).toBe(200);
    expect(reply.payload).toEqual({
      event: "deactivate",
      success: false,
      error: "connection refused",
    });
  });

  it("does not send license credentials or the raw payload to the request logger", async () => {
    const secrets = ["lic_current_secret", "lic_previous_secret", "lic_parent_secret"];

    await invoke({
      event: "deactivate",
      license_key: secrets[0],
      prev_license_key: secrets[1],
      parent_license_key: secrets[2],
      extra: { reason: "Customer request" },
    });

    const serializedLogCalls = JSON.stringify([
      ...mocks.loggerInfo.mock.calls,
      ...mocks.loggerWarn.mock.calls,
      ...mocks.loggerError.mock.calls,
      ...requestLogger.debug.mock.calls,
    ]);
    for (const secret of secrets) {
      expect(serializedLogCalls).not.toContain(secret);
    }
    expect(serializedLogCalls).not.toContain('"payload"');
  });
});

describe("handleAppSumoWebhook — purchase", () => {
  it("creates a pending placeholder license for a new license_key", async () => {
    mocks.execute
      .mockResolvedValueOnce([]) // audit insert
      .mockResolvedValueOnce([]) // existence check: not found
      .mockResolvedValueOnce([]); // insert

    const reply = await invoke({
      event: "purchase",
      license_key: "lic_new",
      tier: 3,
      parent_license_key: "lic_parent",
    });

    expect(mocks.execute).toHaveBeenCalledTimes(3);

    const existence = executedQuery(1);
    expect(existence.sql).toContain("SELECT id FROM appsumo.licenses");
    expect(existence.params).toEqual(["lic_new"]);

    const insert = executedQuery(2);
    expect(insert.sql).toContain("INSERT INTO appsumo.licenses");
    expect(insert.sql).toContain("'pending'");
    expect(insert.sql).toContain("ON CONFLICT (license_key) DO NOTHING");
    expect(insert.params).toEqual(["lic_new", "3", "lic_parent"]);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload).toEqual({ event: "purchase", success: true });
  });

  it("skips the insert when the license already exists", async () => {
    mocks.execute
      .mockResolvedValueOnce([]) // audit insert
      .mockResolvedValueOnce([{ id: 7 }]); // existence check: found

    const reply = await invoke({ event: "purchase", license_key: "lic_dup", tier: 2 });

    expect(mocks.execute).toHaveBeenCalledTimes(2);
    expect(reply.payload).toEqual({ event: "purchase", success: true });
  });
});

describe("handleAppSumoWebhook — activate", () => {
  it("marks the license active with the given tier", async () => {
    await invoke({ event: "activate", license_key: "lic_act", tier: "2" });

    expect(mocks.execute).toHaveBeenCalledTimes(2);
    const update = executedQuery(1);
    expect(update.sql).toContain("UPDATE appsumo.licenses");
    expect(update.sql).toContain("status = 'active'");
    expect(update.params).toEqual(["2", "lic_act"]);
  });

  // PINNED current behavior of `tier?.toString() || "1"` — a suspected weakness:
  // - missing/null/"" tier silently defaults to tier "1"
  // - numeric 0 does NOT default: (0).toString() === "0" is a truthy string, so
  //   a `tier: 0` payload writes the (presumably invalid) tier "0" to the db.
  // The defaulting also means a malformed upgrade payload can silently demote a
  // license to tier 1.
  it.each([
    ["missing", undefined, "1"],
    ["null", null, "1"],
    ["empty string", "", "1"],
    ["numeric zero", 0, "0"],
  ])("tier defaulting: %s tier is written as %s", async (_label, tier, expected) => {
    await invoke({ event: "activate", license_key: "lic_tier", tier: tier as any });

    const update = executedQuery(1);
    expect(update.params).toEqual([expected, "lic_tier"]);
  });
});

describe("handleAppSumoWebhook — upgrade", () => {
  it("transfers the org from the previous license, activates the new key, deactivates the old", async () => {
    mocks.execute
      .mockResolvedValueOnce([]) // audit insert
      .mockResolvedValueOnce([{ organization_id: "org_1" }]) // old license lookup
      .mockResolvedValueOnce([]) // insert new active license
      .mockResolvedValueOnce([]); // deactivate old license

    const reply = await invoke({ event: "upgrade", license_key: "lic_new", prev_license_key: "lic_old", tier: 4 });

    expect(mocks.execute).toHaveBeenCalledTimes(4);

    const lookup = executedQuery(1);
    expect(lookup.sql).toContain("SELECT organization_id FROM appsumo.licenses");
    expect(lookup.params).toEqual(["lic_old"]);

    const insert = executedQuery(2);
    expect(insert.sql).toContain("INSERT INTO appsumo.licenses");
    expect(insert.sql).toContain("'active'");
    expect(insert.sql).toContain("ON CONFLICT (license_key) DO UPDATE");
    // [org, new key, tier, org (conflict set), tier (conflict set)]
    expect(insert.params).toEqual(["org_1", "lic_new", "4", "org_1", "4"]);

    const deactivate = executedQuery(3);
    expect(deactivate.sql).toContain("status = 'inactive'");
    expect(deactivate.params).toEqual(["lic_old"]);

    expect(reply.payload).toEqual({ event: "upgrade", success: true });
  });

  it("creates a pending license when the previous license has no organization yet", async () => {
    mocks.execute
      .mockResolvedValueOnce([]) // audit insert
      .mockResolvedValueOnce([{ organization_id: null }]) // old license, unlinked
      .mockResolvedValueOnce([]) // insert pending license
      .mockResolvedValueOnce([]); // deactivate old license

    await invoke({ event: "upgrade", license_key: "lic_new", prev_license_key: "lic_old", tier: 2 });

    const insert = executedQuery(2);
    expect(insert.sql).toContain("'pending'");
    expect(insert.params).toEqual(["lic_new", "2", "2"]);

    const deactivate = executedQuery(3);
    expect(deactivate.params).toEqual(["lic_old"]);
  });

  it("PINNED: missing prev_license_key is silently ignored after the audit log, still acked as success", async () => {
    const reply = await invoke({ event: "upgrade", license_key: "lic_new", tier: 4 });

    // Only the audit-trail insert ran — no license was created or mutated,
    // yet AppSumo is told the upgrade succeeded.
    expect(mocks.execute).toHaveBeenCalledTimes(1);
    expect(executedQuery(0).sql).toContain("INSERT INTO appsumo.webhook_events");
    expect(reply.statusCode).toBe(200);
    expect(reply.payload).toEqual({ event: "upgrade", success: true });
  });

  it("PINNED (suspected bug): unknown prev_license_key falls back to ANY license with an org and transfers that org", async () => {
    // If the previous license is not found, the handler grabs the most
    // recently updated license belonging to ANY organization and attaches the
    // new license to it. On this public, unauthenticated endpoint that means a
    // fabricated upgrade payload with an unknown prev_license_key can mint an
    // active license attached to another customer's organization.
    mocks.execute
      .mockResolvedValueOnce([]) // audit insert
      .mockResolvedValueOnce([]) // old license lookup: not found
      .mockResolvedValueOnce([{ organization_id: "org_someone_else" }]) // fallback lookup
      .mockResolvedValueOnce([]) // insert new active license
      .mockResolvedValueOnce([]); // deactivate (nonexistent) old license

    const reply = await invoke({
      event: "upgrade",
      license_key: "lic_forged",
      prev_license_key: "lic_unknown",
      tier: 5,
    });

    const fallback = executedQuery(2);
    expect(fallback.sql).toContain("WHERE organization_id IS NOT NULL");
    expect(fallback.sql).toContain("ORDER BY updated_at DESC");

    const insert = executedQuery(3);
    expect(insert.sql).toContain("'active'");
    expect(insert.params).toEqual(["org_someone_else", "lic_forged", "5", "org_someone_else", "5"]);

    expect(reply.payload).toEqual({ event: "upgrade", success: true });
  });

  it("gives up when neither the previous license nor any fallback license exists", async () => {
    mocks.execute
      .mockResolvedValueOnce([]) // audit insert
      .mockResolvedValueOnce([]) // old license lookup: not found
      .mockResolvedValueOnce([]); // fallback lookup: nothing

    const reply = await invoke({ event: "upgrade", license_key: "lic_new", prev_license_key: "lic_gone", tier: 2 });

    expect(mocks.execute).toHaveBeenCalledTimes(3);
    // Still acked as success despite doing nothing.
    expect(reply.payload).toEqual({ event: "upgrade", success: true });
  });
});

describe("handleAppSumoWebhook — downgrade", () => {
  it("transfers the org to the new lower-tier license and deactivates the old one", async () => {
    mocks.execute
      .mockResolvedValueOnce([]) // audit insert
      .mockResolvedValueOnce([{ organization_id: "org_1" }]) // old license lookup
      .mockResolvedValueOnce([]) // insert new active license
      .mockResolvedValueOnce([]); // deactivate old license

    const reply = await invoke({ event: "downgrade", license_key: "lic_down", prev_license_key: "lic_old", tier: 1 });

    expect(mocks.execute).toHaveBeenCalledTimes(4);

    const insert = executedQuery(2);
    expect(insert.sql).toContain("'active'");
    expect(insert.params).toEqual(["org_1", "lic_down", "1", "org_1", "1"]);

    const deactivate = executedQuery(3);
    expect(deactivate.sql).toContain("status = 'inactive'");
    expect(deactivate.params).toEqual(["lic_old"]);

    expect(reply.payload).toEqual({ event: "downgrade", success: true });
  });

  it("PINNED: missing prev_license_key on downgrade is also silently ignored but acked as success", async () => {
    const reply = await invoke({ event: "downgrade", license_key: "lic_down", tier: 1 });

    expect(mocks.execute).toHaveBeenCalledTimes(1); // audit insert only
    expect(reply.payload).toEqual({ event: "downgrade", success: true });
  });
});

describe("handleAppSumoWebhook — deactivate", () => {
  it("marks the license inactive on refund/cancel", async () => {
    await invoke({ event: "deactivate", license_key: "lic_refund", license_status: "active" });

    expect(mocks.execute).toHaveBeenCalledTimes(2);
    const update = executedQuery(1);
    expect(update.sql).toContain("UPDATE appsumo.licenses");
    expect(update.sql).toContain("status = 'inactive'");
    expect(update.params).toEqual(["lic_refund"]);
  });

  it.each(["Upgraded by customer", "Downgraded by customer"])(
    "skips deactivation when the reason is %s (handled by the upgrade/downgrade event)",
    async reason => {
      const reply = await invoke({ event: "deactivate", license_key: "lic_skip", extra: { reason } });

      // Only the audit-trail insert; the license row was not touched.
      expect(mocks.execute).toHaveBeenCalledTimes(1);
      expect(reply.payload).toEqual({ event: "deactivate", success: true });
    }
  );
});

describe("handleAppSumoWebhook — migrate", () => {
  it("re-points the add-on at its new parent license and updates the tier", async () => {
    await invoke({ event: "migrate", license_key: "lic_addon", tier: 2, parent_license_key: "lic_new_parent" });

    expect(mocks.execute).toHaveBeenCalledTimes(2);
    const update = executedQuery(1);
    expect(update.sql).toContain("UPDATE appsumo.licenses");
    expect(update.sql).toContain("parent_license_key");
    expect(update.params).toEqual(["2", "lic_new_parent", "lic_addon"]);
  });

  it("nulls the parent when parent_license_key is missing", async () => {
    await invoke({ event: "migrate", license_key: "lic_addon" });

    const update = executedQuery(1);
    // Tier also defaults to "1" here (same pinned defaulting as activate).
    expect(update.params).toEqual(["1", null, "lic_addon"]);
  });
});
