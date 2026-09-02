import { DateTime } from "luxon";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The lifecycle cron is a state machine: every email is triggered by a state
 * transition or a timeout inside a state, never by a timer from signup. These
 * tests drive the machine through its states with mocked Postgres/ClickHouse
 * and assert which single email (if any) each evaluation produces.
 */

const now = () => DateTime.utc();
const hoursAgo = (h: number) => now().minus({ hours: h }).toSQL({ includeOffset: false })!;
const daysAgo = (d: number) => now().minus({ days: d }).toSQL({ includeOffset: false })!;

const state = vi.hoisted(() => ({
  users: [] as Array<{ id: string; email: string; name: string; createdAt: string }>,
  legacyTipUsers: [] as Array<{ id: string; scheduledTipEmailIds: string[] }>,
  memberships: [] as Array<{ userId: string; organizationId: string; role: string }>,
  sites: [] as Array<{
    siteId: number;
    domain: string;
    createdAt: string;
    organizationId: string;
    detectedPlatform: string | null;
  }>,
  logs: [] as Array<{ userId: string; emailKey: string; sentAt: string }>,
  recentQuietLogs: [] as Array<{ siteId: number; emailKey: string }>,
  goals: [] as Array<{ siteId: number }>,
  owners: [] as Array<{ organizationId: string; userId: string; email: string; name: string }>,
  /** site_id -> aggregate stats returned by the ClickHouse batch query */
  siteStats: [] as Array<{
    site_id: number;
    first_event: string;
    last_event: string;
    total: number;
    pageviews: number;
    custom_events: number;
  }>,
  firstPageview: [] as Array<{ country: string }>,
  overview: [] as Array<{ sessions: number; pageviews: number }>,
  topRows: [] as Array<{ value: string }>,
  convertingPaths: [] as Array<{ pathname: string }>,
  quietCandidates: [] as Array<{ site_id: number; last_event: string }>,
  establishedSites: [] as Array<{ site_id: number; total: number }>,
  /** unique-key guard mirroring the DB constraint */
  sentKeys: new Set<string>(),
  clearedTipUsers: [] as string[],
}));

const mocks = vi.hoisted(() => ({
  sendLifecycleEmail: vi.fn(async (_email: string, _subject: string, _text: string, _idempotencyKey?: string) => true),
  isContactUnsubscribed: vi.fn(async (_email: string) => false),
  cancelScheduledEmail: vi.fn(async (_id: string) => undefined),
  detectPlatform: vi.fn(async () => null),
}));

const insertedStack = vi.hoisted(() => [] as string[]);

vi.mock("../../db/postgres/postgres.js", () => {
  function chain(rows: () => unknown[]) {
    const builder: any = {
      from: () => builder,
      innerJoin: () => builder,
      where: () => builder,
      then: (resolve: any, reject: any) => Promise.resolve(rows()).then(resolve, reject),
    };
    return builder;
  }

  return {
    db: {
      // Reads are told apart by the columns each one selects.
      select: (fields: Record<string, unknown>) =>
        chain(() => {
          if ("scheduledTipEmailIds" in fields) return state.legacyTipUsers;
          if ("emailKey" in fields && "userId" in fields) return state.logs;
          if ("emailKey" in fields && "siteId" in fields) return state.recentQuietLogs;
          if ("role" in fields) return state.memberships;
          if ("createdAt" in fields && "email" in fields) return state.users;
          if ("detectedPlatform" in fields) return state.sites;
          if ("email" in fields && "organizationId" in fields) return state.owners;
          if ("domain" in fields) return state.sites;
          return state.goals;
        }),
      insert: () => ({
        values: (row: { userId: string; emailKey: string }) => ({
          onConflictDoNothing: () => ({
            returning: async () => {
              const key = `${row.userId}:${row.emailKey}`;
              if (state.sentKeys.has(key)) return [];
              state.sentKeys.add(key);
              // Mirror the real table: the row is now visible to later reads
              state.logs.push({
                userId: row.userId,
                emailKey: row.emailKey,
                sentAt: new Date().toISOString(),
              });
              insertedStack.push(key);
              return [{ id: state.sentKeys.size }];
            },
          }),
        }),
      }),
      update: () => ({
        set: (values: Record<string, unknown>) => ({
          where: async () => {
            if ("scheduledTipEmailIds" in values) state.clearedTipUsers.push("cleared");
          },
        }),
      }),
      // The service only deletes the row it just inserted (send-failure
      // rollback), so LIFO removal mirrors the real behavior.
      delete: () => ({
        where: async () => {
          const key = insertedStack.pop();
          if (!key) return;
          state.sentKeys.delete(key);
          const [userId, ...rest] = key.split(":");
          const emailKey = rest.join(":");
          const idx = state.logs.findIndex(l => l.userId === userId && l.emailKey === emailKey);
          if (idx >= 0) state.logs.splice(idx, 1);
        },
      }),
    },
  };
});

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: {
    query: async ({ query }: { query: string }) => {
      const rows = (() => {
        if (query.includes("custom_events")) return state.siteStats;
        if (query.includes("ORDER BY timestamp ASC")) return state.firstPageview;
        if (query.includes("uniq(session_id)")) return state.overview;
        if (query.includes("GROUP BY value")) return state.topRows;
        if (query.includes("INTERVAL 14 DAY")) return state.convertingPaths;
        if (query.includes("HAVING last_event")) return state.quietCandidates;
        if (query.includes("INTERVAL 21 DAY")) return state.establishedSites;
        return [];
      })();
      return { json: async () => rows };
    },
  },
}));

vi.mock("../../lib/email/email.js", () => ({
  sendLifecycleEmail: mocks.sendLifecycleEmail,
  isContactUnsubscribed: mocks.isContactUnsubscribed,
  cancelScheduledEmail: mocks.cancelScheduledEmail,
}));

vi.mock("../../lib/const.js", () => ({ IS_CLOUD: true, SECRET: "test-secret" }));

vi.mock("./platformDetect.js", async importOriginal => {
  const original = await importOriginal<typeof import("./platformDetect.js")>();
  return { ...original, detectPlatform: mocks.detectPlatform };
});

import { lifecycleEmailService } from "./lifecycleEmailService.js";

const run = () => lifecycleEmailService.processLifecycleEmails();
const sentSubjects = () => mocks.sendLifecycleEmail.mock.calls.map(call => call[1]);

const addUser = (id: string, createdAt: string) => {
  state.users.push({ id, email: `${id}@example.com`, name: "Ada", createdAt });
};
const addOwnedSite = (userId: string, siteId: number, domain: string, createdAt: string) => {
  const orgId = `org-${userId}`;
  if (!state.memberships.some(m => m.userId === userId && m.organizationId === orgId)) {
    state.memberships.push({ userId, organizationId: orgId, role: "owner" });
  }
  state.sites.push({ siteId, domain, createdAt, organizationId: orgId, detectedPlatform: null });
};
const markSent = (userId: string, emailKey: string, sentAt: string) => {
  state.logs.push({ userId, emailKey, sentAt });
  state.sentKeys.add(`${userId}:${emailKey}`);
};

beforeEach(() => {
  process.env.BASE_URL = "https://app.rybbit.io";
  for (const value of Object.values(state)) {
    if (Array.isArray(value)) value.length = 0;
    else if (value instanceof Set) value.clear();
  }
  vi.clearAllMocks();
  mocks.sendLifecycleEmail.mockResolvedValue(true);
  mocks.isContactUnsubscribed.mockResolvedValue(false);
  insertedStack.length = 0;
  // Reset singleton run-state between tests
  (lifecycleEmailService as any).lastWentQuietAt = null;
  (lifecycleEmailService as any).legacyTipsCancelled = true;
  (lifecycleEmailService as any).negativeCache.clear();
});

describe("state: signed up, no site", () => {
  it("sends the finish-setup email once the 2h timeout passes", async () => {
    addUser("u1", hoursAgo(3));
    await run();
    expect(sentSubjects()).toEqual(["Finish setting up Rybbit"]);
  });

  it("sends nothing before the timeout", async () => {
    addUser("u1", hoursAgo(1));
    await run();
    expect(mocks.sendLifecycleEmail).not.toHaveBeenCalled();
  });

  it("never sends the same email twice", async () => {
    addUser("u1", hoursAgo(3));
    await run();
    await run();
    expect(mocks.sendLifecycleEmail).toHaveBeenCalledTimes(1);
  });

  it("escalates to the reply-based ask after 3 days, then stops without touching the provider", async () => {
    addUser("u1", daysAgo(4));
    markSent("u1", "no_site_1", daysAgo(3));
    await run();
    expect(sentSubjects()).toEqual(["Was something unclear?"]);

    // Once both terminal keys exist, later ticks must be provider-silent:
    // no unsubscribe lookup, no conflicting insert, no send attempt.
    mocks.isContactUnsubscribed.mockClear();
    await run();
    expect(mocks.sendLifecycleEmail).toHaveBeenCalledTimes(1);
    expect(mocks.isContactUnsubscribed).not.toHaveBeenCalled();
  });

  it("includes unverified users (this app doesn't require email verification)", async () => {
    // The query-level fix can't be seen through the mock, but the behavior
    // contract is documented here: eligibility is not gated on emailVerified.
    addUser("u1", hoursAgo(3));
    await run();
    expect(mocks.sendLifecycleEmail).toHaveBeenCalledTimes(1);
  });

  it("skips invited teammates who own no organization", async () => {
    addUser("u1", hoursAgo(5));
    state.memberships.push({ userId: "u1", organizationId: "someone-elses-org", role: "member" });
    await run();
    expect(mocks.sendLifecycleEmail).not.toHaveBeenCalled();
  });

  it("skips unsubscribed users entirely", async () => {
    addUser("u1", hoursAgo(3));
    mocks.isContactUnsubscribed.mockResolvedValue(true);
    await run();
    expect(mocks.sendLifecycleEmail).not.toHaveBeenCalled();
  });
});

describe("state: site created, no data", () => {
  it("sends the snippet email an hour after site creation", async () => {
    addUser("u1", hoursAgo(4));
    addOwnedSite("u1", 42, "acme.com", hoursAgo(2));
    await run();
    expect(sentSubjects()).toEqual(["One step left for acme.com"]);
    const body = mocks.sendLifecycleEmail.mock.calls[0][2];
    expect(body).toContain('data-site-id="42"');
  });

  it("times the install check from the snippet send, not site age", async () => {
    // Pre-existing site picked up at rollout: 30h old, snippet sent on the
    // previous tick. The check must NOT follow ten minutes later.
    addUser("u1", daysAgo(2));
    addOwnedSite("u1", 42, "acme.com", hoursAgo(30));
    markSent("u1", "install_snippet:42", hoursAgo(0.2));
    await run();
    expect(mocks.sendLifecycleEmail).not.toHaveBeenCalled();

    // 24h after the snippet, the check goes out.
    state.logs.length = 0;
    markSent("u1", "install_snippet:42", hoursAgo(25));
    await run();
    expect(sentSubjects()).toEqual(["Still nothing from acme.com"]);
    const body = mocks.sendLifecycleEmail.mock.calls[0][2];
    expect(body).toContain("/api/site/check-install?siteId=42&domain=acme.com&exp=");
  });

  it("sends the final reply-based email 4 days after the check and nothing after", async () => {
    addUser("u1", daysAgo(7));
    addOwnedSite("u1", 42, "acme.com", daysAgo(6));
    markSent("u1", "install_snippet:42", daysAgo(6));
    markSent("u1", "install_check:42", daysAgo(5));
    await run();
    expect(sentSubjects()).toEqual(["Need a hand with acme.com?"]);

    mocks.isContactUnsubscribed.mockClear();
    await run();
    expect(mocks.sendLifecycleEmail).toHaveBeenCalledTimes(1);
    expect(mocks.isContactUnsubscribed).not.toHaveBeenCalled();
  });

  it("still helps install a new site when another site already has data", async () => {
    addUser("u1", daysAgo(20));
    addOwnedSite("u1", 1, "working.com", daysAgo(20));
    addOwnedSite("u1", 2, "newsite.com", hoursAgo(3));
    state.siteStats.push({ site_id: 1, first_event: daysAgo(19), last_event: hoursAgo(1), total: 9000, pageviews: 8500, custom_events: 40 });
    markSent("u1", "site_live:1", daysAgo(19));
    await run();
    expect(sentSubjects()).toEqual(["One step left for newsite.com"]);
  });
});

describe("transition: first data arrives", () => {
  it("sends 'you're live' immediately, bypassing the educational gap", async () => {
    addUser("u1", daysAgo(1));
    addOwnedSite("u1", 42, "acme.com", hoursAgo(20));
    // snippet email went out an hour ago - the gap must not delay the transition email
    markSent("u1", "install_snippet:42", hoursAgo(1));
    state.siteStats.push({ site_id: 42, first_event: hoursAgo(1), last_event: hoursAgo(1), total: 5, pageviews: 5, custom_events: 0 });
    state.firstPageview.push({ country: "DE" });
    await run();
    expect(sentSubjects()).toEqual(["Rybbit is live on acme.com"]);
    const body = mocks.sendLifecycleEmail.mock.calls[0][2];
    expect(body).toContain("Germany");
  });

  it("passes a stable idempotency key to the provider", async () => {
    addUser("u1", daysAgo(1));
    addOwnedSite("u1", 42, "acme.com", hoursAgo(20));
    state.siteStats.push({ site_id: 42, first_event: hoursAgo(1), last_event: hoursAgo(1), total: 5, pageviews: 5, custom_events: 0 });
    await run();
    expect(mocks.sendLifecycleEmail.mock.calls[0][3]).toBe("lifecycle:u1:site_live:42");
  });

  it("does not send it for sites whose first event is old (pre-existing traffic)", async () => {
    addUser("u1", daysAgo(20));
    addOwnedSite("u1", 42, "acme.com", daysAgo(20));
    state.siteStats.push({ site_id: 42, first_event: daysAgo(15), last_event: hoursAgo(1), total: 900, pageviews: 850, custom_events: 3 });
    await run();
    expect(sentSubjects()).not.toContain("Rybbit is live on acme.com");
  });

  it("retries next tick when the provider rejects the send", async () => {
    addUser("u1", daysAgo(1));
    addOwnedSite("u1", 42, "acme.com", hoursAgo(20));
    state.siteStats.push({ site_id: 42, first_event: hoursAgo(1), last_event: hoursAgo(1), total: 5, pageviews: 5, custom_events: 0 });
    mocks.sendLifecycleEmail.mockResolvedValueOnce(false);
    await run();
    // First run: attempted but rejected; the log row is rolled back, so the
    // next run attempts the same key again.
    await run();
    expect(mocks.sendLifecycleEmail).toHaveBeenCalledTimes(2);
    expect(mocks.sendLifecycleEmail.mock.calls[1][1]).toBe("Rybbit is live on acme.com");
  });
});

describe("state: data flowing", () => {
  const flowingSite = (customEvents = 0) => {
    addUser("u1", daysAgo(10));
    addOwnedSite("u1", 42, "acme.com", daysAgo(10));
    state.siteStats.push({ site_id: 42, first_event: daysAgo(4), last_event: hoursAgo(2), total: 500, pageviews: 450, custom_events: customEvents });
    markSent("u1", "site_live:42", daysAgo(4));
  };

  it("sends the first-days report keyed to data age, with real numbers", async () => {
    flowingSite();
    state.overview.push({ sessions: 120, pageviews: 340 });
    state.topRows.push({ value: "google.com" });
    await run();
    expect(sentSubjects()).toEqual(["Your first days of data on acme.com"]);
    const body = mocks.sendLifecycleEmail.mock.calls[0][2];
    expect(body).toContain("120 visits");
    expect(body).toContain("google.com");
  });

  it("holds educational emails until the 48h gap has passed", async () => {
    addUser("u1", daysAgo(10));
    addOwnedSite("u1", 42, "acme.com", daysAgo(10));
    state.siteStats.push({ site_id: 42, first_event: daysAgo(4), last_event: hoursAgo(2), total: 500, pageviews: 450, custom_events: 0 });
    markSent("u1", "site_live:42", hoursAgo(10));
    await run();
    expect(mocks.sendLifecycleEmail).not.toHaveBeenCalled();
  });

  it("nudges goals only when the data shows a converting path and no goal exists", async () => {
    addUser("u1", daysAgo(15));
    addOwnedSite("u1", 42, "acme.com", daysAgo(15));
    state.siteStats.push({ site_id: 42, first_event: daysAgo(8), last_event: hoursAgo(2), total: 2000, pageviews: 1900, custom_events: 4 });
    markSent("u1", "site_live:42", daysAgo(4));
    markSent("u1", "first_days:42", daysAgo(4));
    state.convertingPaths.push({ pathname: "/thank-you" });
    await run();
    expect(sentSubjects()).toEqual(["Visitors are reaching /thank-you - measure it"]);

    // With a goal already configured, the nudge never fires
    state.sentKeys.delete("u1:nudge_goals:42");
    mocks.sendLifecycleEmail.mockClear();
    state.goals.push({ siteId: 42 });
    await run();
    expect(sentSubjects()).not.toContain("Visitors are reaching /thank-you - measure it");
  });

  it("nudges custom events only when the site has none", async () => {
    addUser("u1", daysAgo(20));
    addOwnedSite("u1", 42, "acme.com", daysAgo(20));
    state.siteStats.push({ site_id: 42, first_event: daysAgo(11), last_event: hoursAgo(2), total: 2000, pageviews: 1900, custom_events: 0 });
    markSent("u1", "site_live:42", daysAgo(5));
    markSent("u1", "first_days:42", daysAgo(5));
    await run();
    expect(sentSubjects()).toEqual(["See what visitors actually do on acme.com"]);
  });
});

describe("state: went quiet", () => {
  const quietSite = () => {
    state.quietCandidates.push({ site_id: 7, last_event: hoursAgo(50) });
    state.establishedSites.push({ site_id: 7, total: 5000 });
    state.sites.push({ siteId: 7, domain: "quiet.com", createdAt: daysAgo(200), organizationId: "org-x", detectedPlatform: null });
    state.owners.push({ organizationId: "org-x", userId: "owner1", email: "owner1@example.com", name: "Ada" });
  };

  it("alerts the owner when an established site stops sending data, once per outage", async () => {
    quietSite();
    await run();
    expect(sentSubjects()).toEqual(["We stopped hearing from quiet.com"]);
    // Hourly cadence: force the next run to include the went-quiet pass again.
    (lifecycleEmailService as any).lastWentQuietAt = null;
    await run();
    expect(mocks.sendLifecycleEmail).toHaveBeenCalledTimes(1);
  });

  it("skips sites without an established baseline", async () => {
    state.quietCandidates.push({ site_id: 7, last_event: hoursAgo(50) });
    // establishedSites empty: only a handful of test events, no alert
    state.sites.push({ siteId: 7, domain: "quiet.com", createdAt: daysAgo(200), organizationId: "org-x", detectedPlatform: null });
    state.owners.push({ organizationId: "org-x", userId: "owner1", email: "owner1@example.com", name: "Ada" });
    await run();
    expect(mocks.sendLifecycleEmail).not.toHaveBeenCalled();
  });

  it("respects the 30-day per-site cooldown for repeat outages", async () => {
    quietSite();
    state.recentQuietLogs.push({ siteId: 7, emailKey: "went_quiet:7:2026-08-15" });
    await run();
    expect(mocks.sendLifecycleEmail).not.toHaveBeenCalled();
  });

  it("sends one owner at most one alert per run even with several quiet sites", async () => {
    quietSite();
    state.quietCandidates.push({ site_id: 8, last_event: hoursAgo(52) });
    state.establishedSites.push({ site_id: 8, total: 3000 });
    state.sites.push({ siteId: 8, domain: "quiet2.com", createdAt: daysAgo(200), organizationId: "org-x", detectedPlatform: null });
    await run();
    expect(mocks.sendLifecycleEmail).toHaveBeenCalledTimes(1);
  });
});

describe("rollout", () => {
  it("cancels tips the retired drip already scheduled in Resend", async () => {
    (lifecycleEmailService as any).legacyTipsCancelled = false;
    state.legacyTipUsers.push({ id: "u9", scheduledTipEmailIds: ["re_1", "re_2", "re_3"] });
    await run();
    expect(mocks.cancelScheduledEmail).toHaveBeenCalledTimes(3);
    expect(mocks.cancelScheduledEmail).toHaveBeenCalledWith("re_1");
    expect(state.clearedTipUsers.length).toBe(1);
  });
});
