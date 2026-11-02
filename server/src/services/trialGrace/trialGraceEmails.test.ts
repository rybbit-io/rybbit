import { DateTime } from "luxon";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrialGrace } from "../../lib/subscriptionUtils.js";

/**
 * The grace emails decide which notice an organization's owners are due and send each one
 * once. Postgres (owners, the email log), ClickHouse (traffic) and the sender are mocked.
 */
const state = vi.hoisted(() => ({
  owners: [] as Array<{ userId: string; email: string }>,
  log: [] as Array<{ id: number; userId: string; emailKey: string; sentAt: string }>,
  traffic: [] as Array<{ site_id: number; visitors: number; pageviews: number }>,
  nextId: 1,
}));

const mocks = vi.hoisted(() => ({ sendTrialGraceEmail: vi.fn() }));

class IdempotencyConflict extends Error {}

vi.mock("../../db/postgres/postgres.js", () => {
  const chain = (rows: () => unknown[]) => {
    const builder: any = {
      from: () => builder,
      innerJoin: () => builder,
      where: () => builder,
      then: (resolve: any, reject: any) => Promise.resolve(rows()).then(resolve, reject),
    };
    return builder;
  };
  return {
    db: {
      // The owner and email-log reads are told apart by the columns each one selects.
      select: (fields: Record<string, unknown>) => chain(() => ("emailKey" in fields ? state.log : state.owners)),
      insert: () => ({
        values: (row: { userId: string; emailKey: string }) => ({
          onConflictDoNothing: () => ({
            returning: async () => {
              if (state.log.some(r => r.userId === row.userId && r.emailKey === row.emailKey)) return [];
              const id = state.nextId++;
              state.log.push({ id, ...row, sentAt: DateTime.utc().toSQL({ includeOffset: false })! });
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

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: async () => ({ json: async () => state.traffic }) },
}));

vi.mock("../../lib/email/email.js", () => ({
  sendTrialGraceEmail: mocks.sendTrialGraceEmail,
  isIdempotencyConflict: (error: unknown) => error instanceof IdempotencyConflict,
}));

vi.mock("../../lib/logger/logger.js", () => ({
  createServiceLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { trialGraceEmails, trialGraceStage } from "./trialGraceEmails.js";

const trialEndedAt = DateTime.fromISO("2026-10-01T00:00:00Z", { zone: "utc" });

const grace = (overrides: Partial<TrialGrace> = {}): TrialGrace => ({
  subscriptionId: "sub_trial",
  planName: "standard100k",
  trialEndedAt: trialEndedAt.toJSDate(),
  endsAt: trialEndedAt.plus({ days: 60 }).toJSDate(),
  retryingPayment: false,
  ...overrides,
});

const org = { id: "org_1", name: "Acme Inc" };
const sites = [
  { siteId: 1, domain: "docs.acme.com" },
  { siteId: 2, domain: "acme.com" },
];
const day = (n: number) => trialEndedAt.plus({ days: n });

beforeEach(() => {
  state.owners = [{ userId: "u_owner", email: "owner@acme.com" }];
  state.log = [];
  state.traffic = [{ site_id: 2, visitors: 40, pageviews: 120 }];
  mocks.sendTrialGraceEmail.mockReset();
  mocks.sendTrialGraceEmail.mockResolvedValue(undefined);
});

describe("trialGraceStage", () => {
  it("starts, turns midway after 30 days, and gives final notice in the last week", () => {
    expect(trialGraceStage(grace(), day(0))).toBe("started");
    expect(trialGraceStage(grace(), day(29))).toBe("started");
    expect(trialGraceStage(grace(), day(30))).toBe("midway");
    expect(trialGraceStage(grace(), day(52))).toBe("midway");
    expect(trialGraceStage(grace(), day(53))).toBe("final");
  });
});

describe("trialGraceEmails.sendDue", () => {
  it("sends the owners the notice they're due, with each site's traffic since the trial ended", async () => {
    await trialGraceEmails.sendDue(org, grace(), sites, day(1));

    expect(mocks.sendTrialGraceEmail).toHaveBeenCalledWith(
      "owner@acme.com",
      {
        stage: "started",
        organizationId: "org_1",
        organizationName: "Acme Inc",
        trialEndedAt: grace().trialEndedAt,
        endsAt: grace().endsAt,
        sites: [
          { domain: "acme.com", visitors: 40, pageviews: 120 },
          { domain: "docs.acme.com", visitors: 0, pageviews: 0 },
        ],
        now: day(1),
      },
      "trial-grace:u_owner:trial_grace:sub_trial:started"
    );
    expect(state.log.map(r => r.emailKey)).toEqual(["trial_grace:sub_trial:started"]);
  });

  it("sends each stage once", async () => {
    await trialGraceEmails.sendDue(org, grace(), sites, day(1));
    await trialGraceEmails.sendDue(org, grace(), sites, day(2));

    expect(mocks.sendTrialGraceEmail).toHaveBeenCalledTimes(1);
  });

  it("waits a few days after one notice before sending the next", async () => {
    state.log = [
      {
        id: 99,
        userId: "u_owner",
        emailKey: "trial_grace:sub_trial:midway",
        sentAt: day(51).toSQL({ includeOffset: false })!,
      },
    ];

    await trialGraceEmails.sendDue(org, grace(), sites, day(53));
    expect(mocks.sendTrialGraceEmail).not.toHaveBeenCalled();

    await trialGraceEmails.sendDue(org, grace(), sites, day(54));
    expect(mocks.sendTrialGraceEmail).toHaveBeenCalledWith(
      "owner@acme.com",
      expect.objectContaining({ stage: "final" }),
      "trial-grace:u_owner:trial_grace:sub_trial:final"
    );
  });

  it("stays quiet while Stripe is still retrying the first charge", async () => {
    await trialGraceEmails.sendDue(org, grace({ retryingPayment: true }), sites, day(1));

    expect(mocks.sendTrialGraceEmail).not.toHaveBeenCalled();
  });

  it("releases the claim when the send fails, so the next run tries again", async () => {
    mocks.sendTrialGraceEmail.mockRejectedValueOnce(new Error("resend down"));

    await trialGraceEmails.sendDue(org, grace(), sites, day(1));
    expect(state.log).toEqual([]);

    await trialGraceEmails.sendDue(org, grace(), sites, day(1));
    expect(mocks.sendTrialGraceEmail).toHaveBeenCalledTimes(2);
    expect(state.log).toHaveLength(1);
    // Same Resend key both times, so a first send that did go out can't be repeated.
    expect(mocks.sendTrialGraceEmail.mock.calls[0][2]).toBe(mocks.sendTrialGraceEmail.mock.calls[1][2]);
  });

  it("keeps the claim when Resend says the key was already used, because that email went out", async () => {
    mocks.sendTrialGraceEmail.mockRejectedValueOnce(new IdempotencyConflict("invalid_idempotent_request"));

    await trialGraceEmails.sendDue(org, grace(), sites, day(1));
    await trialGraceEmails.sendDue(org, grace(), sites, day(2));

    expect(state.log.map(r => r.emailKey)).toEqual(["trial_grace:sub_trial:started"]);
    expect(mocks.sendTrialGraceEmail).toHaveBeenCalledTimes(1);
  });
});
