import { render as renderEmail } from "@react-email/components";
import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import type { DigestSite, SiteReport, WeeklyDigest } from "../../../services/weekyReports/weeklyReportTypes.js";
import { installSnippet, welcome } from "../../../services/lifecycleEmails/lifecycleContent.js";
import { formatChange, percentChange } from "../format.js";
import { ApproachingLimitEmail, approachingLimitSubject, projectedLimitDate } from "./ApproachingLimitEmail.js";
import { ChangeEmailEmail } from "./ChangeEmailEmail.js";
import { InvitationEmail } from "./InvitationEmail.js";
import { LetterEmail } from "./LetterEmail.js";
import { LimitExceededEmail } from "./LimitExceededEmail.js";
import { OtpEmail } from "./OtpEmail.js";
import { SiteTransferEmail } from "./SiteTransferEmail.js";
import { TrialGraceEmail, trialGraceSubject } from "./TrialGraceEmail.js";
import { VerifyEmailEmail } from "./VerifyEmailEmail.js";
import { WeeklyDigestEmail, weeklyDigestPreview, weeklyDigestSubject } from "./WeeklyDigestEmail.js";
import { WeeklyReportEmail, weeklyReportSubject } from "./WeeklyReportEmail.js";

/** Rendered HTML without the <!-- --> markers React puts between adjacent text nodes. */
const render = async (element: Parameters<typeof renderEmail>[0]) =>
  (await renderEmail(element)).replace(/<!-- -->/g, "");

const overview = (users: number) => ({
  sessions: users * 2,
  pageviews: users * 5,
  users,
  pages_per_session: 2.5,
  bounce_rate: 40,
  session_duration: 120,
});

const report = (users: number, previousUsers: number): SiteReport => ({
  siteId: 7,
  siteName: "Acme",
  siteDomain: "acme.com",
  weekStart: "2026-10-12",
  weekEnd: "2026-10-18",
  currentWeek: overview(users),
  previousWeek: overview(previousUsers),
  daily: Array.from({ length: 7 }, (_, i) => ({ date: `2026-10-${12 + i}`, sessions: 10 + i, previousSessions: 5 })),
  topCountries: [{ value: "DE", count: 40, percentage: 40 }],
  topPages: [{ value: "/pricing", count: 30, percentage: 30 }],
  topReferrers: [{ value: "news.ycombinator.com", count: 20, percentage: 20 }],
  deviceBreakdown: [{ value: "desktop", count: 60, percentage: 60 }],
});

const usage = {
  organizationName: "Acme Inc",
  eventCount: 91_000,
  eventLimit: 100_000,
  sites: [
    { domain: "acme.com", events: 61_000 },
    { domain: "docs.acme.com", events: 30_000 },
  ],
  now: DateTime.fromISO("2026-10-24T12:00:00Z") as DateTime<true>,
};

describe("Ledger templates", () => {
  it("use the PNG logo, which Gmail and Outlook can display", async () => {
    const html = await render(OtpEmail({ otp: "381924", type: "forget-password", email: "ada@acme.com" }));
    expect(html).toContain("/rybbit/email-logo.png");
    expect(html).not.toContain(".svg");
  });

  it("show the reset code and the account it belongs to", async () => {
    const html = await render(OtpEmail({ otp: "381924", type: "forget-password", email: "ada@acme.com" }));
    expect(html).toContain("Reset your password");
    expect(html).toContain("381");
    expect(html).toContain("924");
    expect(html).toContain("ada@acme.com");
  });

  it("print verification and change links as a paste-able fallback", async () => {
    const verify = await render(
      VerifyEmailEmail({ email: "ada@acme.com", verificationUrl: "https://x.test/verify?t=1" })
    );
    expect(verify).toContain("https://x.test/verify?t=1");

    const change = await render(
      ChangeEmailEmail({ currentEmail: "ada@acme.com", newEmail: "ada@new.dev", confirmUrl: "https://x.test/confirm" })
    );
    expect(change).toContain("ada@acme.com");
    expect(change).toContain("ada@new.dev");
    expect(change).toContain("https://x.test/confirm");
  });

  it("name the inviter and the role in an invitation", async () => {
    const html = await render(
      InvitationEmail({
        inviterName: "Sam Chen",
        inviterEmail: "sam@acme.com",
        organizationName: "Acme Inc",
        role: "admin",
        expiresAt: new Date("2026-10-26T14:02:00Z"),
        inviteLink: "https://x.test/invite",
      })
    );
    expect(html).toContain("Sam Chen (sam@acme.com)");
    expect(html).toContain("Admin");
    expect(html).toContain("Oct 26, 2026 at 14:02 UTC");
  });

  it("show the site and expiry in a transfer", async () => {
    const html = await render(
      SiteTransferEmail({
        email: "tay@example.org",
        sentBy: "sam@acme.com",
        sentByEmail: "sam@acme.com",
        siteDomain: "acme.com",
        organizationName: "Acme Inc",
        expiresAt: "2026-10-31T10:00:00.000Z",
        transferLink: "https://x.test/transfer",
      })
    );
    expect(html).toContain("acme.com");
    expect(html).toContain("Oct 31, 2026");
  });
});

describe("usage emails", () => {
  it("project the date the limit will be reached at this month's rate", () => {
    // 91,000 events in 23.5 days is ~3,872 a day, so the last 9,000 take ~2.3 days.
    expect(projectedLimitDate(91_000, 100_000, usage.now)?.toISODate()).toBe("2026-10-26");
    // A pace that only reaches the limit after the reset projects nothing.
    expect(projectedLimitDate(10_000, 100_000, usage.now)).toBeNull();
  });

  it("put the share used in the subject", () => {
    expect(approachingLimitSubject("Acme Inc", 91_000, 100_000, usage.now)).toBe(
      "Acme Inc has used 91% of its October events"
    );
  });

  it("break usage down by site", async () => {
    const html = await render(ApproachingLimitEmail(usage));
    expect(html).toContain("docs.acme.com");
    expect(html).toContain("Resets Nov 1");
  });

  it("say tracking stopped, not that data became unavailable", async () => {
    const html = await render(LimitExceededEmail({ ...usage, eventCount: 100_412 }));
    expect(html).toContain("Tracking is paused for Acme Inc");
    expect(html).toContain("Your dashboards and existing data are still available.");
    expect(html).not.toContain("access your data");
  });
});

describe("weekly report", () => {
  it("leads with visitors and their change in the subject", () => {
    expect(weeklyReportSubject(report(6105, 5560))).toBe("acme.com: 6,105 visitors last week, up 9.8%");
    expect(weeklyReportSubject(report(90, 100))).toBe("acme.com: 90 visitors last week, down 10.0%");
  });

  it("doesn't call growth from zero +100%", async () => {
    expect(percentChange(50, 0)).toBeNull();
    expect(weeklyReportSubject(report(50, 0))).toBe("acme.com: 50 visitors last week");
    const html = await render(WeeklyReportEmail({ site: report(50, 0), unsubscribeUrl: "https://x.test/off" }));
    expect(html).not.toContain("+100");
    expect(html).toContain("from 0");
  });

  it("formats changes with a real minus sign", () => {
    expect(formatChange(9.84)).toBe("+9.8%");
    expect(formatChange(-5.4)).toBe("−5.4%");
    expect(formatChange(0.01)).toBe("0%");
  });

  it("names countries without emoji flags and links referrers without third-party favicons", async () => {
    const html = await render(WeeklyReportEmail({ site: report(10, 8), unsubscribeUrl: "https://x.test/off" }));
    expect(html).toContain("Germany");
    expect(html).not.toContain("\u{1F1E9}");
    expect(html).not.toContain("google.com/s2/favicons");
  });

  it("carries the one-click link to turn reports off", async () => {
    const html = await render(WeeklyReportEmail({ site: report(10, 8), unsubscribeUrl: "https://x.test/off" }));
    expect(html).toContain("Turn off weekly reports");
    expect(html).toContain("https://x.test/off");
  });
});

describe("letters", () => {
  it("render the welcome email as Ledger HTML with Bill's sign-off", async () => {
    const html = await render(LetterEmail({ letter: welcome("Ada Lovelace") }));
    expect(html).toContain("Hi Ada,");
    expect(html).toContain("Founder, Rybbit");
  });

  it("render a site's tracking script in the snippet email", async () => {
    const html = await render(
      LetterEmail({
        letter: installSnippet([{ domain: "acme.com", siteId: 42, platform: null }], "Ada"),
        footer: [{ label: "Unsubscribe from these emails", href: "https://x.test/unsub" }],
      })
    );
    expect(html).toContain("data-site-id=&quot;42&quot;");
    expect(html).toContain("https://x.test/unsub");
  });
});

const digestSite = (overrides: Partial<DigestSite>): DigestSite => ({
  siteId: 1,
  siteDomain: "acme.com",
  organizationId: "org_acme",
  organizationName: "Acme Inc",
  users: 100,
  previousUsers: 80,
  daily: [10, 12, 14, 30, 12, 8, 9],
  lastPageviewAt: null,
  ...overrides,
});

const digest = (sites: DigestSite[]): WeeklyDigest => ({ weekStart: "2026-10-12", weekEnd: "2026-10-18", sites });

describe("weekly digest", () => {
  const sites = [
    digestSite({ siteId: 1, siteDomain: "acme.com", users: 6105, previousUsers: 5560 }),
    digestSite({ siteId: 2, siteDomain: "shop.acme.com", users: 914, previousUsers: 698 }),
    digestSite({
      siteId: 3,
      siteDomain: "status.acme.com",
      users: 0,
      previousUsers: 120,
      daily: [0, 0, 0, 0, 0, 0, 0],
      lastPageviewAt: "2026-10-11T23:41:00.000Z",
    }),
  ];

  it("totals every site in the subject, naming the organization when there is one", () => {
    expect(weeklyDigestSubject(digest(sites))).toBe("Acme Inc last week: 7,019 visitors across 3 sites");
    expect(
      weeklyDigestSubject(digest([...sites, digestSite({ siteId: 4, organizationId: "org_b", organizationName: "B" })]))
    ).toBe("Last week: 7,119 visitors across 4 sites");
  });

  it("previews the fastest grower and the site that went quiet", () => {
    expect(weeklyDigestPreview(digest(sites))).toBe(
      "shop.acme.com up 30.9% · status.acme.com had no pageviews all week · Oct 12–18"
    );
  });

  it("lists every site and calls out the quiet one with its last pageview", async () => {
    const html = await render(WeeklyDigestEmail({ digest: digest(sites), unsubscribeUrl: "https://x.test/off" }));
    expect(html).toContain("Your 3 sites had 7,019 visitors last week");
    expect(html).toContain("shop.acme.com");
    expect(html).toContain("status.acme.com isn&#x27;t sending data");
    expect(html).toContain("No pageviews since Oct 11, 2026 at 23:41 UTC");
    expect(html).toContain("https://x.test/off");
  });

  it("caps the quiet-site callout so a mass outage can't bloat the email", async () => {
    const quiet = Array.from({ length: 13 }, (_, i) =>
      digestSite({ ...sites[2], siteId: 100 + i, siteDomain: `quiet${i}.acme.com` })
    );
    const html = await render(
      WeeklyDigestEmail({ digest: digest([sites[0], ...quiet]), unsubscribeUrl: "https://x.test/off" })
    );
    expect(html).toContain("13 sites aren&#x27;t sending data");
    expect(html.split("No pageviews since").length - 1).toBe(10);
    expect(html).toContain("Plus 3 more sites.");
  });

  it("groups sites by organization when they span several", async () => {
    const html = await render(
      WeeklyDigestEmail({
        digest: digest([
          sites[0],
          digestSite({ siteId: 9, organizationId: "org_b", organizationName: "Side Project" }),
        ]),
        unsubscribeUrl: "https://x.test/off",
      })
    );
    expect(html).toContain("Acme Inc");
    expect(html).toContain("Side Project");
  });
});

describe("trial grace emails", () => {
  const graceNow = DateTime.fromISO("2026-10-24T12:00:00Z") as DateTime<true>;
  const grace = (stage: "started" | "midway" | "final", visitors = 1204) => ({
    stage,
    organizationId: "org_acme",
    organizationName: "Acme Inc",
    trialEndedAt: new Date("2026-10-20T09:00:00Z"),
    endsAt: new Date("2026-12-19T09:00:00Z"),
    sites: [{ domain: "acme.com", visitors, pageviews: visitors * 3 }],
    now: graceNow,
  });

  it("says tracking continues and when the data goes", async () => {
    expect(trialGraceSubject(grace("started"))).toBe("Your trial ended. Rybbit is still tracking acme.com");
    const html = await render(TrialGraceEmail(grace("started")));
    expect(html).toContain("Your trial ended, but we&#x27;re still tracking acme.com");
    expect(html).toContain("Dec 19, 2026");
    // The owner's active organization may be another one; the link picks this one.
    expect(html).toContain("/settings/billing?organization=org_acme");
  });

  it("counts what came in since the trial ended", async () => {
    expect(trialGraceSubject(grace("midway"))).toBe("acme.com: 1,204 visitors since your Rybbit trial ended");
    expect(trialGraceSubject(grace("midway", 0))).toBe("Your Rybbit data is here until Dec 19");
    const html = await render(TrialGraceEmail(grace("midway")));
    expect(html).toContain("acme.com had 1,204 visitors since your trial ended");
  });

  it("gives the deletion date in the last week", async () => {
    const final = { ...grace("final"), now: DateTime.fromISO("2026-12-14T12:00:00Z") as DateTime<true> };
    expect(trialGraceSubject(final)).toBe("Your Rybbit data will be deleted after Dec 19");
    const html = await render(TrialGraceEmail(final));
    expect(html).toContain("That&#x27;s 5 days from now");
  });
});
