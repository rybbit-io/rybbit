import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The recovery emails decide whether a failed invoice or a canceled subscription is worth an
 * email, and send it once per owner. Postgres (the organization, its owners, the email log),
 * the plan lookup and the sender are mocked.
 */
const state = vi.hoisted(() => ({
  org: { id: "org_1", name: "Acme Inc" } as { id: string; name: string } | null,
  owners: [] as Array<{ userId: string; email: string }>,
  log: [] as Array<{ id: number; userId: string; emailKey: string }>,
  nextId: 1,
  plan: { source: "free" } as Record<string, unknown>,
}));

const mocks = vi.hoisted(() => ({
  sendPaymentFailedEmail: vi.fn(),
  invalidateStripeSubscriptionCache: vi.fn(),
}));

class IdempotencyConflict extends Error {}

vi.mock("../../db/postgres/postgres.js", () => {
  const chain = (rows: () => unknown[]) => {
    const builder: any = {
      from: () => builder,
      innerJoin: () => builder,
      where: () => builder,
      limit: () => builder,
      then: (resolve: any, reject: any) => Promise.resolve(rows()).then(resolve, reject),
    };
    return builder;
  };
  return {
    db: {
      // The organization and owner reads are told apart by the columns each one selects.
      select: (fields: Record<string, unknown>) =>
        chain(() => ("email" in fields ? state.owners : state.org ? [state.org] : [])),
      insert: () => ({
        values: (row: { userId: string; emailKey: string }) => ({
          onConflictDoNothing: () => ({
            returning: async () => {
              if (state.log.some(r => r.userId === row.userId && r.emailKey === row.emailKey)) return [];
              const id = state.nextId++;
              state.log.push({ id, ...row });
              return [{ id }];
            },
          }),
        }),
      }),
      // Only ever used to release the claim just made.
      delete: () => ({ where: async () => void state.log.pop() }),
    },
  };
});

vi.mock("../../lib/email/email.js", () => ({
  sendPaymentFailedEmail: mocks.sendPaymentFailedEmail,
  isIdempotencyConflict: (error: unknown) => error instanceof IdempotencyConflict,
}));

vi.mock("../../lib/subscriptionUtils.js", () => ({
  getBestSubscription: async () => state.plan,
  invalidateStripeSubscriptionCache: mocks.invalidateStripeSubscriptionCache,
}));

vi.mock("../../lib/logger/logger.js", () => ({
  createServiceLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { invoiceSubscriptionId, paymentFailedEmails } from "./paymentFailedEmails.js";

const NEXT_ATTEMPT = 1795200000;

const invoice = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "in_1",
    customer: "cus_1",
    billing_reason: "subscription_cycle",
    collection_method: "charge_automatically",
    amount_due: 1900,
    currency: "usd",
    next_payment_attempt: NEXT_ATTEMPT,
    subscription: "sub_1",
    ...overrides,
  }) as any;

const canceled = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "sub_1",
    customer: "cus_1",
    cancellation_details: { reason: "payment_failed" },
    ...overrides,
  }) as any;

beforeEach(() => {
  state.org = { id: "org_1", name: "Acme Inc" };
  state.owners = [{ userId: "u_owner", email: "owner@acme.com" }];
  state.log = [];
  state.plan = { source: "free" };
  mocks.sendPaymentFailedEmail.mockReset();
  mocks.sendPaymentFailedEmail.mockResolvedValue(undefined);
  mocks.invalidateStripeSubscriptionCache.mockReset();
});

describe("invoiceSubscriptionId", () => {
  it("reads the subscription from either place Stripe has kept it", () => {
    expect(invoiceSubscriptionId({ subscription: "sub_old" } as any)).toBe("sub_old");
    expect(invoiceSubscriptionId({ parent: { subscription_details: { subscription: "sub_new" } } } as any)).toBe(
      "sub_new"
    );
    expect(invoiceSubscriptionId({} as any)).toBeNull();
  });
});

describe("paymentFailedEmails.onPaymentFailed", () => {
  it("emails the owners the amount, the next try and that the plan is on hold", async () => {
    await paymentFailedEmails.onPaymentFailed(invoice());

    expect(mocks.invalidateStripeSubscriptionCache).toHaveBeenCalledWith("cus_1");
    expect(mocks.sendPaymentFailedEmail).toHaveBeenCalledWith(
      "owner@acme.com",
      {
        stage: "failed",
        organizationId: "org_1",
        organizationName: "Acme Inc",
        amountDue: 1900,
        currency: "usd",
        nextAttemptAt: new Date(NEXT_ATTEMPT * 1000),
        tracking: "paused",
      },
      "payment-recovery:u_owner:payment_failed:in_1"
    );
  });

  it("says tracking is still on during the grace period after a trial", async () => {
    state.plan = { source: "free", trialGrace: { endsAt: new Date(Date.now() + 86_400_000) } };

    await paymentFailedEmails.onPaymentFailed(invoice());

    expect(mocks.sendPaymentFailedEmail.mock.calls[0][1]).toMatchObject({ tracking: "on" });
  });

  it("says tracking is still on when a plan that has been paid for is kept on", async () => {
    state.plan = { source: "stripe", pastDue: { subscriptionId: "sub_1", planName: "standard100k" } };

    await paymentFailedEmails.onPaymentFailed(invoice());

    expect(mocks.sendPaymentFailedEmail.mock.calls[0][1]).toMatchObject({ tracking: "on" });
  });

  it("doesn't say either way when another plan covers the organization", async () => {
    state.plan = { source: "appsumo" };

    await paymentFailedEmails.onPaymentFailed(invoice());

    expect(mocks.sendPaymentFailedEmail.mock.calls[0][1]).toMatchObject({ tracking: "unknown" });
  });

  it("emails once per invoice however many retries fail", async () => {
    await paymentFailedEmails.onPaymentFailed(invoice());
    await paymentFailedEmails.onPaymentFailed(invoice({ next_payment_attempt: null }));

    expect(mocks.sendPaymentFailedEmail).toHaveBeenCalledTimes(1);
  });

  it("tries again on the next failed attempt when the send failed", async () => {
    mocks.sendPaymentFailedEmail.mockRejectedValueOnce(new Error("Resend is down"));

    await paymentFailedEmails.onPaymentFailed(invoice());
    expect(state.log).toEqual([]);

    await paymentFailedEmails.onPaymentFailed(invoice());
    expect(mocks.sendPaymentFailedEmail).toHaveBeenCalledTimes(2);
    expect(state.log).toHaveLength(1);
  });

  it("keeps the claim when Resend says the email already went out", async () => {
    mocks.sendPaymentFailedEmail.mockRejectedValueOnce(new IdempotencyConflict());

    await paymentFailedEmails.onPaymentFailed(invoice());

    expect(state.log).toHaveLength(1);
  });

  it.each([
    ["a declined card at checkout", { billing_reason: "subscription_create" }],
    ["an invoiced subscription", { collection_method: "send_invoice" }],
    ["an invoice with nothing due", { amount_due: 0 }],
    ["an invoice that isn't for a subscription", { subscription: null }],
  ])("ignores %s", async (_name, overrides) => {
    await paymentFailedEmails.onPaymentFailed(invoice(overrides));

    expect(mocks.sendPaymentFailedEmail).not.toHaveBeenCalled();
  });

  it("ignores a customer that belongs to no organization", async () => {
    state.org = null;

    await paymentFailedEmails.onPaymentFailed(invoice());

    expect(mocks.sendPaymentFailedEmail).not.toHaveBeenCalled();
  });
});

describe("paymentFailedEmails.onSubscriptionCanceled", () => {
  it("tells the owners when Stripe cancels a paid plan for non-payment", async () => {
    await paymentFailedEmails.onSubscriptionCanceled(canceled());

    expect(mocks.sendPaymentFailedEmail).toHaveBeenCalledWith(
      "owner@acme.com",
      { stage: "canceled", organizationId: "org_1", organizationName: "Acme Inc" },
      "payment-recovery:u_owner:payment_canceled:sub_1"
    );
  });

  it("says nothing when the customer canceled themselves", async () => {
    await paymentFailedEmails.onSubscriptionCanceled(
      canceled({ cancellation_details: { reason: "cancellation_requested" } })
    );

    expect(mocks.sendPaymentFailedEmail).not.toHaveBeenCalled();
  });

  it("leaves an unpaid trial to the grace period emails", async () => {
    state.plan = { source: "free", trialGrace: { endsAt: new Date(Date.now() + 86_400_000) } };

    await paymentFailedEmails.onSubscriptionCanceled(canceled());

    expect(mocks.sendPaymentFailedEmail).not.toHaveBeenCalled();
  });

  it("says nothing when the organization still has a plan", async () => {
    state.plan = { source: "stripe" };

    await paymentFailedEmails.onSubscriptionCanceled(canceled());

    expect(mocks.sendPaymentFailedEmail).not.toHaveBeenCalled();
  });
});
