import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  // The handler captures STRIPE_WEBHOOK_SECRET at module load time, so it has
  // to exist before ./webhook.js is imported (vi.hoisted runs before imports).
  // Capture whatever was there so afterAll can restore it.
  const previousWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";

  const selectLimit = vi.fn(async (): Promise<{ id: string }[]> => []);
  const selectWhere = vi.fn((_where: unknown) => ({ limit: selectLimit }));
  const selectFrom = vi.fn(() => ({ where: selectWhere }));
  const select = vi.fn(() => ({ from: selectFrom }));

  const updateWhere = vi.fn(async (_where: unknown) => undefined);
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set: updateSet }));

  return {
    previousWebhookSecret,
    constructEvent: vi.fn(),
    invalidateStripeSubscriptionCache: vi.fn(),
    select,
    selectWhere,
    selectLimit,
    update,
    updateSet,
    updateWhere,
  };
});

vi.mock("../../lib/stripe.js", () => ({
  stripe: { webhooks: { constructEvent: mocks.constructEvent } },
}));

vi.mock("../../db/postgres/postgres.js", () => ({
  db: { select: mocks.select, update: mocks.update },
}));

vi.mock("../../lib/subscriptionUtils.js", () => ({
  invalidateStripeSubscriptionCache: mocks.invalidateStripeSubscriptionCache,
}));

import { handleWebhook } from "./webhook.js";

const dialect = new PgDialect();

const SIGNATURE = "t=1700000000,v1=deadbeef";

type RequestOverrides = {
  rawBody?: string | Buffer | null;
  headers?: Record<string, string | undefined>;
  parsedBody?: unknown;
};

function createRequest(overrides: RequestOverrides = {}) {
  const rawBody = "rawBody" in overrides ? overrides.rawBody : '{"id":"evt_raw"}';
  return {
    headers: overrides.headers ?? { "stripe-signature": SIGNATURE },
    body: overrides.parsedBody,
    raw: rawBody === null ? {} : { body: rawBody },
  } as any;
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

function stripeEvent(type: string, object: Record<string, unknown>) {
  return { type, data: { object } } as any;
}

function expectNoDbWrites() {
  expect(mocks.select).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.updateSet).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.selectLimit.mockResolvedValue([]);
  mocks.updateWhere.mockResolvedValue(undefined);
});

afterAll(() => {
  // Restore whatever STRIPE_WEBHOOK_SECRET held before this suite mutated it.
  if (mocks.previousWebhookSecret === undefined) {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  } else {
    process.env.STRIPE_WEBHOOK_SECRET = mocks.previousWebhookSecret;
  }
});

describe("handleWebhook — signature verification", () => {
  it("rejects a request with a missing stripe-signature header and writes nothing", async () => {
    // The handler forwards the (undefined) header to constructEvent, which the
    // real Stripe SDK rejects — simulate that.
    mocks.constructEvent.mockImplementation((_body: unknown, sig: unknown) => {
      if (!sig) throw new Error("No stripe-signature header value was provided.");
      return stripeEvent("noop", {});
    });

    const reply = createReply();
    await handleWebhook(createRequest({ headers: {} }), reply);

    expect(mocks.constructEvent).toHaveBeenCalledWith('{"id":"evt_raw"}', undefined, "whsec_test_secret");
    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toContain("Webhook Error");
    expectNoDbWrites();
    expect(mocks.invalidateStripeSubscriptionCache).not.toHaveBeenCalled();
  });

  it("returns 400 on an invalid signature and performs NO db write for a forged event", async () => {
    mocks.constructEvent.mockImplementation(() => {
      throw new Error("Signature verification failed");
    });

    const reply = createReply();
    await handleWebhook(
      createRequest({
        rawBody: JSON.stringify({
          type: "checkout.session.completed",
          data: {
            object: {
              mode: "subscription",
              customer: "cus_forged",
              metadata: { organizationId: "victim_org" },
            },
          },
        }),
      }),
      reply
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toContain("Webhook Error: Signature verification failed");
    // CRITICAL: a forged event must never touch the database or the cache.
    expectNoDbWrites();
    expect(mocks.invalidateStripeSubscriptionCache).not.toHaveBeenCalled();
  });

  it("passes the RAW body (not the parsed JSON body) to constructEvent", async () => {
    // Security invariant: signature verification must run over the exact bytes
    // Stripe signed. Using the parsed/re-serialized body would break (or worse,
    // bypass) verification.
    const rawBody = '{"id": "evt_1",  "type": "some.event"}';
    mocks.constructEvent.mockReturnValue(stripeEvent("some.event", {}));

    const reply = createReply();
    await handleWebhook(createRequest({ rawBody, parsedBody: { id: "evt_1", type: "tampered.event" } }), reply);

    expect(mocks.constructEvent).toHaveBeenCalledTimes(1);
    expect(mocks.constructEvent).toHaveBeenCalledWith(rawBody, SIGNATURE, "whsec_test_secret");
    const [firstArg] = mocks.constructEvent.mock.calls[0];
    expect(typeof firstArg).toBe("string");
    expect(firstArg).not.toEqual({ id: "evt_1", type: "tampered.event" });
  });

  it("returns 400 without calling constructEvent when no raw body is available", async () => {
    const reply = createReply();
    await handleWebhook(createRequest({ rawBody: null }), reply);

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toBe("Webhook error: No raw body available");
    expect(mocks.constructEvent).not.toHaveBeenCalled();
    expectNoDbWrites();
  });
});

describe("handleWebhook — checkout.session.completed", () => {
  it("writes the stripe customer id onto the org from session.metadata.organizationId", async () => {
    mocks.constructEvent.mockReturnValue(
      stripeEvent("checkout.session.completed", {
        id: "cs_1",
        mode: "subscription",
        customer: "cus_123",
        metadata: { organizationId: "org_1" },
      })
    );

    const reply = createReply();
    await handleWebhook(createRequest(), reply);

    expect(mocks.invalidateStripeSubscriptionCache).toHaveBeenCalledWith("cus_123");

    // Looked up by stripeCustomerId first (idempotency check).
    const lookupWhere = dialect.sqlToQuery(mocks.selectWhere.mock.calls[0][0] as SQL);
    expect(lookupWhere.params).toEqual(["cus_123"]);

    // Then wrote the customer id onto the org named in the session metadata.
    expect(mocks.updateSet).toHaveBeenCalledWith({ stripeCustomerId: "cus_123" });
    const updateWhere = dialect.sqlToQuery(mocks.updateWhere.mock.calls[0][0] as SQL);
    expect(updateWhere.params).toEqual(["org_1"]);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload).toEqual({ received: true });
  });

  it("does not overwrite when an org already has this stripe customer id", async () => {
    mocks.selectLimit.mockResolvedValue([{ id: "org_existing" }]);
    mocks.constructEvent.mockReturnValue(
      stripeEvent("checkout.session.completed", {
        id: "cs_2",
        mode: "subscription",
        customer: "cus_123",
        metadata: { organizationId: "org_1" },
      })
    );

    const reply = createReply();
    await handleWebhook(createRequest(), reply);

    expect(mocks.select).toHaveBeenCalledTimes(1);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(reply.payload).toEqual({ received: true });
  });

  it("returns 500 (retriable) when the idempotency lookup fails, so Stripe retries", async () => {
    mocks.selectLimit.mockRejectedValue(new Error("db down"));
    mocks.constructEvent.mockReturnValue(
      stripeEvent("checkout.session.completed", {
        id: "cs_err_read",
        mode: "subscription",
        customer: "cus_123",
        metadata: { organizationId: "org_1" },
      })
    );

    const reply = createReply();
    await handleWebhook(createRequest(), reply);

    expect(reply.statusCode).toBe(500);
    expect(reply.payload).toEqual({ error: "Failed to link organization to Stripe customer." });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("returns 500 (retriable) when writing the customer id fails, so Stripe retries", async () => {
    mocks.updateWhere.mockRejectedValue(new Error("write failed"));
    mocks.constructEvent.mockReturnValue(
      stripeEvent("checkout.session.completed", {
        id: "cs_err_write",
        mode: "subscription",
        customer: "cus_123",
        metadata: { organizationId: "org_1" },
      })
    );

    const reply = createReply();
    await handleWebhook(createRequest(), reply);

    expect(reply.statusCode).toBe(500);
    expect(reply.payload).toEqual({ error: "Failed to link organization to Stripe customer." });
  });

  // Non-retriable: a Stripe retry would redeliver the same metadata-less
  // session, so the handler acks with 200 instead of asking for a retry.
  it.each([
    ["missing metadata", undefined],
    ["missing organizationId", {}],
    ["empty organizationId", { organizationId: "" }],
  ])("skips the db entirely but still invalidates the cache when %s", async (_label, metadata) => {
    mocks.constructEvent.mockReturnValue(
      stripeEvent("checkout.session.completed", {
        id: "cs_3",
        mode: "subscription",
        customer: "cus_123",
        metadata,
      })
    );

    const reply = createReply();
    await handleWebhook(createRequest(), reply);

    expectNoDbWrites();
    // The cache invalidation happens before the metadata check.
    expect(mocks.invalidateStripeSubscriptionCache).toHaveBeenCalledWith("cus_123");
    // Still acknowledged to Stripe.
    expect(reply.statusCode).toBe(200);
    expect(reply.payload).toEqual({ received: true });
  });

  it("ignores non-subscription checkout sessions", async () => {
    mocks.constructEvent.mockReturnValue(
      stripeEvent("checkout.session.completed", {
        id: "cs_4",
        mode: "payment",
        customer: "cus_123",
        metadata: { organizationId: "org_1" },
      })
    );

    const reply = createReply();
    await handleWebhook(createRequest(), reply);

    expectNoDbWrites();
    expect(mocks.invalidateStripeSubscriptionCache).not.toHaveBeenCalled();
    expect(reply.payload).toEqual({ received: true });
  });
});

describe("handleWebhook — subscription lifecycle events", () => {
  it.each(["customer.subscription.updated", "customer.subscription.deleted"])(
    "invalidates the subscription cache for the event's customer on %s",
    async eventType => {
      mocks.constructEvent.mockReturnValue(stripeEvent(eventType, { id: "sub_1", customer: "cus_lifecycle" }));

      const reply = createReply();
      await handleWebhook(createRequest(), reply);

      expect(mocks.invalidateStripeSubscriptionCache).toHaveBeenCalledTimes(1);
      expect(mocks.invalidateStripeSubscriptionCache).toHaveBeenCalledWith("cus_lifecycle");
      expectNoDbWrites();
      expect(reply.payload).toEqual({ received: true });
    }
  );
});

describe("handleWebhook — unhandled event types", () => {
  it("acknowledges unhandled events without side effects", async () => {
    mocks.constructEvent.mockReturnValue(stripeEvent("invoice.paid", { id: "in_1", customer: "cus_1" }));

    const reply = createReply();
    await handleWebhook(createRequest(), reply);

    expectNoDbWrites();
    expect(mocks.invalidateStripeSubscriptionCache).not.toHaveBeenCalled();
    expect(reply.statusCode).toBe(200);
    expect(reply.payload).toEqual({ received: true });
  });
});
