import { appUrl, formatCount, plural } from "../../lib/email/format.js";
import { greeting, type Letter, type LetterBlock } from "../../lib/email/letter.js";
import type { PlatformInfo } from "./platformDetect.js";

export type LifecycleEmail = Letter;

const SETUP_GUIDES_URL = "https://rybbit.com/docs/script";

/**
 * Multi-site emails list at most this many sites in the body; the rest are
 * summarised as a count so an agency onboarding 40 domains gets a readable
 * email rather than 40 script tags.
 */
export const MAX_LISTED_SITES = 10;

/** "acme.com" or "acme.com and 3 other sites" for subjects. */
export const subjectDomains = (domains: string[]): string => {
  const others = domains.length - 1;
  if (others <= 0) return domains[0];
  return `${domains[0]} and ${others} other site${others === 1 ? "" : "s"}`;
};

const overflow = (total: number): LetterBlock[] => {
  const hidden = total - MAX_LISTED_SITES;
  return hidden > 0 ? [{ type: "note", text: `Plus ${plural(hidden, "more site")}.` }] : [];
};

export const snippetFor = (siteId: number) =>
  `<script src="${appUrl()}/api/script.js" data-site-id="${siteId}" defer></script>`;

// ---------------------------------------------------------------------------
// Signup
// ---------------------------------------------------------------------------

export const welcome = (name?: string | null): LifecycleEmail => ({
  subject: "Welcome to Rybbit!",
  preview: "Thanks for signing up! Here's how to get started.",
  greeting: greeting(name),
  blocks: [
    { type: "p", text: "Welcome to Rybbit, and thanks for signing up! I'm Bill, the founder." },
    { type: "p", text: "Rybbit is fully self-funded, so we only answer to the people who use it." },
    { type: "p", text: "Getting set up takes about a minute:" },
    {
      type: "steps",
      steps: [
        { title: "Add your site", detail: "Just the domain" },
        { title: "Paste one script tag", detail: "In your site's <head>" },
        { title: "See your first visitor", detail: "Live on your dashboard" },
      ],
    },
    { type: "button", label: "Add your site", href: appUrl() },
    { type: "p", text: "If you have any questions or run into problems, just reply to this email." },
  ],
});

// ---------------------------------------------------------------------------
// Stage 1: signed up, no site
// ---------------------------------------------------------------------------

export const noSite1 = (name?: string | null): LifecycleEmail => ({
  subject: "Finish setting up Rybbit",
  preview: "You haven't added a site yet. It only takes a minute.",
  greeting: greeting(name),
  blocks: [
    {
      type: "p",
      text: "Looks like you haven't added your website yet. It only takes a minute. Enter your domain and we'll give you a script tag to paste.",
    },
    { type: "button", label: "Add your site", href: appUrl() },
    { type: "p", text: "If something got in the way, just reply and let me know." },
  ],
});

export const noSite2 = (name?: string | null): LifecycleEmail => ({
  subject: "Was something unclear?",
  preview: "Just reply and I'll help. This is my last email about it.",
  greeting: greeting(name),
  blocks: [
    {
      type: "p",
      text: "You signed up for Rybbit a few days ago but haven't added a site yet. Did something get in the way?",
    },
    {
      type: "p",
      text: "If you have a question about pricing, privacy or anything else, just reply and I'll help. And if we could have done something better, I'd like to hear that too.",
    },
    { type: "p", text: "This is the last email I'll send about it." },
  ],
});

// ---------------------------------------------------------------------------
// Stage 2: site created, no data
// ---------------------------------------------------------------------------

export interface SnippetSite {
  domain: string;
  siteId: number;
  platform: PlatformInfo | null;
}

export const installSnippet = (sitesIn: SnippetSite[], name?: string | null): LifecycleEmail => {
  const domains = sitesIn.map(s => s.domain);
  const preview = "Add one script tag to your site's <head> and you're done.";
  if (sitesIn.length === 1) {
    const [{ domain, siteId, platform }] = sitesIn;
    return {
      subject: `One step left for ${domain}`,
      preview,
      greeting: greeting(name),
      blocks: [
        { type: "p", text: `${domain} is set up. Now add this script to the <head> of every page:` },
        { type: "code", code: snippetFor(siteId) },
        {
          type: "rows",
          rows: [
            { label: "Site", value: domain },
            { label: "Site ID", value: String(siteId), strong: true },
            ...(platform ? [{ label: "Platform", value: platform.label }] : []),
          ],
        },
        ...(platform
          ? ([
              { type: "p", text: `Your site looks like it's built with ${platform.label}. Here's our guide for it.` },
              { type: "button", label: `Open the ${platform.label} guide`, href: platform.guideUrl },
            ] as LetterBlock[])
          : ([
              { type: "p", text: "Using a framework or CMS? We have setup guides for most of them." },
              { type: "button", label: "Open the setup guides", href: SETUP_GUIDES_URL },
            ] as LetterBlock[])),
        {
          type: "p",
          text: "Once it's installed, visits show up on your dashboard right away. If it's not working, just reply and I'll help.",
        },
      ],
    };
  }

  return {
    subject: `One step left for ${subjectDomains(domains)}`,
    preview,
    greeting: greeting(name),
    blocks: [
      {
        type: "p",
        text: `You've added ${sitesIn.length} sites to Rybbit. Each one needs its own script in the <head> of every page:`,
      },
      ...sitesIn.slice(0, MAX_LISTED_SITES).map((s): LetterBlock => ({
        type: "site",
        domain: s.domain,
        code: snippetFor(s.siteId),
        ...(s.platform ? { guide: { label: s.platform.label, url: s.platform.guideUrl } } : {}),
      })),
      ...overflow(sitesIn.length),
      {
        type: "p",
        text: "Every site's script is also in its site settings, and we have setup guides for most frameworks and CMSs.",
      },
      { type: "button", label: "Open the setup guides", href: SETUP_GUIDES_URL },
      {
        type: "p",
        text: "Once it's installed, visits show up on your dashboard right away. If something isn't working, just reply and I'll help.",
      },
    ],
  };
};

export interface CheckSite {
  domain: string;
  checkInstallUrl: string;
}

const INSTALL_CAUSES = [
  { title: "The script isn't on the live site", detail: "Check the page source of your live site" },
  { title: "The site hasn't been redeployed since you added it", detail: "Redeploy, then reload the page" },
  { title: "An adblocker is blocking your own test visit", detail: "Try a private window" },
];

export const installCheck = (sitesIn: CheckSite[], name?: string | null): LifecycleEmail => {
  const domains = sitesIn.map(s => s.domain);
  const preview = "Here's how to check that the script is installed.";
  if (sitesIn.length === 1) {
    const [{ domain, checkInstallUrl }] = sitesIn;
    return {
      subject: `No data from ${domain} yet`,
      preview,
      greeting: greeting(name),
      blocks: [
        { type: "p", text: `We haven't received any data from ${domain} yet. Usually it's one of these:` },
        { type: "steps", steps: INSTALL_CAUSES },
        { type: "p", text: `Or click below and we'll check ${domain} for the script.` },
        { type: "button", label: `Check ${domain} now`, href: checkInstallUrl },
        { type: "p", text: "Still stuck? Just reply and I'll take a look." },
      ],
    };
  }

  return {
    subject: `No data from ${subjectDomains(domains)} yet`,
    preview,
    greeting: greeting(name),
    blocks: [
      {
        type: "p",
        text: `We haven't received any data from ${sitesIn.length} of your sites yet. Usually it's one of these:`,
      },
      { type: "steps", steps: INSTALL_CAUSES },
      { type: "p", text: "Or click a site below and we'll check it for the script." },
      {
        type: "rows",
        rows: sitesIn
          .slice(0, MAX_LISTED_SITES)
          .map(s => ({ label: s.domain, value: "Check now", href: s.checkInstallUrl })),
      },
      ...overflow(sitesIn.length),
      { type: "p", text: "Still stuck? Just reply and I'll take a look." },
    ],
  };
};

export const installFinal = (domains: string[], name?: string | null): LifecycleEmail => {
  const single = domains.length === 1;
  return {
    subject: `Need a hand with ${subjectDomains(domains)}?`,
    preview: "Reply with your platform and I'll send you setup steps.",
    greeting: greeting(name),
    blocks: [
      {
        type: "p",
        text: single
          ? `${domains[0]} still isn't sending data to Rybbit. This is my last reminder.`
          : `${domains.length} of your sites still aren't sending data to Rybbit. This is my last reminder.`,
      },
      ...(single
        ? []
        : ([
            {
              type: "rows",
              rows: domains.slice(0, MAX_LISTED_SITES).map(domain => ({ label: domain, value: "No data yet" })),
            },
            ...overflow(domains.length),
          ] as LetterBlock[])),
      {
        type: "p",
        text: "If you got stuck, reply with what your site runs on (WordPress, Next.js, Shopify…) and I'll send you step-by-step instructions. And if Rybbit isn't for you, I'd love to know why.",
      },
      { type: "p", text: "Thanks for trying Rybbit either way." },
    ],
  };
};

// ---------------------------------------------------------------------------
// Stage 3: data flowing
// ---------------------------------------------------------------------------

export interface LiveSite {
  domain: string;
  siteId: number;
}

/** What we know about a site's first pageview, each field optional. */
export interface FirstPageview {
  receivedAt: string | null;
  country: string | null;
  pathname: string | null;
  device: string | null;
}

export const siteLive = (sitesIn: LiveSite[], first: FirstPageview | null, name?: string | null): LifecycleEmail => {
  const domains = sitesIn.map(s => s.domain);
  const closing: LetterBlock = {
    type: "p",
    text: "In a few days I'll send you a quick summary of what's coming in.",
  };
  if (sitesIn.length === 1) {
    const [{ domain, siteId }] = sitesIn;
    const country = first?.country ?? null;
    const facts = [
      first?.receivedAt && { label: "Received", value: first.receivedAt },
      country && { label: "Country", value: country },
      first?.pathname && { label: "Page", value: first.pathname },
      first?.device && { label: "Device", value: first.device },
    ].filter((row): row is { label: string; value: string } => !!row);
    return {
      subject: `Rybbit is live on ${domain}`,
      preview: country ? `Your first visitor just arrived, from ${country}.` : "Your first visitor just arrived.",
      greeting: greeting(name),
      blocks: [
        {
          type: "p",
          text: `You just got your first visitor on ${domain}${country ? `, from ${country}` : ""}. Tracking is working.`,
        },
        ...(facts.length > 0 ? [{ type: "rows", rows: facts } as LetterBlock] : []),
        { type: "button", label: "Watch your traffic live", href: `${appUrl()}/${siteId}` },
        closing,
      ],
    };
  }

  return {
    subject: `Rybbit is live on ${subjectDomains(domains)}`,
    preview: `Data is coming in from ${sitesIn.length} of your sites.`,
    greeting: greeting(name),
    blocks: [
      { type: "p", text: `Rybbit is now getting data from ${sitesIn.length} of your sites. Tracking is working.` },
      {
        type: "rows",
        rows: sitesIn
          .slice(0, MAX_LISTED_SITES)
          .map(s => ({ label: s.domain, value: "Open dashboard", href: `${appUrl()}/${s.siteId}` })),
      },
      ...overflow(sitesIn.length),
      closing,
    ],
  };
};

export interface FirstDaysStats {
  sessions: number;
  pageviews: number;
  topReferrer: string | null;
  topPage: string | null;
}

export const firstDays = (
  domain: string,
  siteId: number,
  stats: FirstDaysStats,
  days: number,
  name?: string | null
): LifecycleEmail => ({
  subject: `Your first days of data on ${domain}`,
  preview: `${plural(stats.sessions, "visit")} so far.${stats.topReferrer ? ` Your top source is ${stats.topReferrer}.` : ""}`,
  greeting: greeting(name),
  blocks: [
    { type: "p", text: `Here's how ${domain}'s first ${plural(days, "day")} on Rybbit went:` },
    {
      type: "stats",
      stats: [
        { label: "Visits", value: formatCount(stats.sessions) },
        { label: "Pageviews", value: formatCount(stats.pageviews) },
        { label: "Days tracked", value: formatCount(days) },
      ],
    },
    ...(stats.topReferrer || stats.topPage
      ? [
          {
            type: "rows",
            rows: [
              ...(stats.topReferrer ? [{ label: "Top source", value: stats.topReferrer }] : []),
              ...(stats.topPage ? [{ label: "Most viewed page", value: stats.topPage }] : []),
            ],
          } as LetterBlock,
        ]
      : []),
    {
      type: "p",
      text: "If these numbers look higher than in Google Analytics, that's expected. Adblockers hide 10–30% of visitors from GA, but they rarely block Rybbit.",
    },
    { type: "button", label: "Open your dashboard", href: `${appUrl()}/${siteId}` },
  ],
});

export const nudgeEvents = (domain: string, siteId: number, name?: string | null): LifecycleEmail => ({
  subject: `Track clicks and signups on ${domain}`,
  preview: "It takes one line of code, or none.",
  greeting: greeting(name),
  blocks: [
    {
      type: "p",
      text: "You can track things like button clicks, signups and downloads with custom events. It's one line of JavaScript:",
    },
    { type: "code", code: 'window.rybbit.event("signup_clicked")' },
    { type: "p", text: "Or add an attribute to your HTML:" },
    { type: "code", code: '<button data-rybbit-event="signup_clicked">Sign up</button>' },
    { type: "p", text: "Events show up on your dashboard, and you can use them in goals and funnels." },
    { type: "button", label: "Read the events guide", href: "https://rybbit.com/docs/track-events" },
  ],
});

export interface ConvertingPath {
  pathname: string;
  /** Sessions that reached the page in the lookback window. */
  sessions: number;
}

export const nudgeGoals = (
  domain: string,
  siteId: number,
  converting: ConvertingPath,
  name?: string | null
): LifecycleEmail => ({
  subject: `Turn ${converting.pathname} into a goal`,
  preview: "See your conversion rate by source, country and device.",
  greeting: greeting(name),
  blocks: [
    {
      type: "p",
      text: `${plural(converting.sessions, "session")} on ${domain} reached ${converting.pathname} in the last two weeks. That looks like a conversion page.`,
    },
    {
      type: "rows",
      rows: [
        { label: "Page", value: converting.pathname },
        { label: "Reached in 14 days", value: plural(converting.sessions, "session"), strong: true },
      ],
    },
    {
      type: "p",
      text: "If you make it a goal, Rybbit will show your conversion rate by source, country and device. You can also build a funnel to see where people drop off on the way there.",
    },
    {
      type: "button",
      label: `Create a goal for ${converting.pathname}`,
      href: `${appUrl()}/${siteId}/goals`,
      secondary: { label: "Goals guide", href: "https://rybbit.com/docs/goals" },
    },
  ],
});

// ---------------------------------------------------------------------------
// Stage 4: went quiet
// ---------------------------------------------------------------------------

export interface QuietSite {
  domain: string;
  siteId: number;
  lastEventAt: string;
}

export const wentQuiet = (sitesIn: QuietSite[], name?: string | null): LifecycleEmail => {
  const domains = sitesIn.map(s => s.domain);
  if (sitesIn.length === 1) {
    const [{ domain, siteId, lastEventAt }] = sitesIn;
    return {
      subject: `${domain} stopped sending data`,
      preview: `Nothing since ${lastEventAt}.`,
      greeting: greeting(name),
      blocks: [
        { type: "p", text: `We haven't received any data from ${domain} since ${lastEventAt}.` },
        {
          type: "rows",
          rows: [
            { label: "Site", value: domain },
            { label: "Last event", value: lastEventAt, strong: true },
          ],
        },
        { type: "p", text: "If you were expecting traffic, check that the tracking script is still on your site." },
        { type: "button", label: "Open the dashboard", href: `${appUrl()}/${siteId}` },
        { type: "p", text: "If you removed it on purpose, you can ignore this. I won't email about it again." },
      ],
    };
  }

  return {
    subject: `${subjectDomains(domains)} stopped sending data`,
    preview: `Nothing from ${sitesIn.length} of your sites for two days or more.`,
    greeting: greeting(name),
    blocks: [
      {
        type: "p",
        text: `We haven't received any data from ${sitesIn.length} of your sites for two days or more:`,
      },
      {
        type: "rows",
        rows: sitesIn.slice(0, MAX_LISTED_SITES).map(s => ({ label: s.domain, value: `Last event ${s.lastEventAt}` })),
      },
      ...overflow(sitesIn.length),
      { type: "p", text: "If you were expecting traffic, check that the tracking script is still on each site." },
      { type: "button", label: "Open Rybbit", href: appUrl() },
      {
        type: "p",
        text: "If you removed them on purpose, you can ignore this. I won't email about these sites again.",
      },
    ],
  };
};
