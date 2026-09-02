import type { PlatformInfo } from "./platformDetect.js";

export interface LifecycleEmail {
  subject: string;
  text: string;
}

const appUrl = () => (process.env.BASE_URL || "https://app.rybbit.io").replace(/\/$/, "");

const greeting = (name?: string | null) => {
  // Email-signup users have their email prefix stored as their name - don't greet with that
  const clean = name && !name.includes("@") ? name.split(" ")[0] : "";
  return clean ? `Hi ${clean},` : "Hi,";
};

const signoff = `\n\nBill\nFounder, Rybbit`;

export const snippetFor = (siteId: number) =>
  `<script src="${appUrl()}/api/script.js" data-site-id="${siteId}" defer></script>`;

// ---------------------------------------------------------------------------
// Stage 1: signed up, no site
// ---------------------------------------------------------------------------

export const noSite1 = (name?: string | null): LifecycleEmail => ({
  subject: "Finish setting up Rybbit",
  text: `${greeting(name)}

Looks like you haven't added your website yet. It takes about a minute - you give us the domain, we give you one script tag.

Pick up where you left off: ${appUrl()}

If anything was confusing or got in your way, just reply and tell me - I read every response.${signoff}`,
});

export const noSite2 = (name?: string | null): LifecycleEmail => ({
  subject: "Was something unclear?",
  text: `${greeting(name)}

You signed up for Rybbit a few days ago but haven't added a site. That usually means something got in the way - a question about pricing, self-hosting, privacy, or just timing.

Whatever it was, I'd genuinely like to know. Reply with one line and I'll help, or tell me what we could have done better.

This is the last email I'll send unless you start using Rybbit.${signoff}`,
});

// ---------------------------------------------------------------------------
// Stage 2: site created, no data
// ---------------------------------------------------------------------------

export const installSnippet = (
  domain: string,
  siteId: number,
  platform: PlatformInfo | null,
  name?: string | null
): LifecycleEmail => ({
  subject: `One step left for ${domain}`,
  text: `${greeting(name)}

${domain} is set up on Rybbit - it just needs the tracking snippet. Add this to the <head> of every page:

${snippetFor(siteId)}
${
  platform
    ? `\nYour site looks like it runs on ${platform.label}. Here's the exact guide for it:\n${platform.guideUrl}\n`
    : `\nUsing a framework or CMS? We have step-by-step guides for most of them:\nhttps://rybbit.com/docs/script\n`
}
As soon as the first pageview arrives you'll see it live on your dashboard. If it's not working after a few minutes, reply and I'll help you debug it.${signoff}`,
});

export const installCheck = (domain: string, checkInstallUrl: string, name?: string | null): LifecycleEmail => ({
  subject: `Still nothing from ${domain}`,
  text: `${greeting(name)}

Your Rybbit snippet hasn't sent any data from ${domain} yet. The three most common causes:

1. The snippet isn't in the <head> of the deployed site (check view-source on the live page)
2. The site hasn't been redeployed since you added it
3. An adblocker on your own browser is blocking your test visit - try a private window

Click here and we'll fetch ${domain} right now and tell you whether the snippet is there:
${checkInstallUrl}

Stuck? Reply to this email and I'll take a look personally.${signoff}`,
});

export const installFinal = (domain: string, name?: string | null): LifecycleEmail => ({
  subject: `Need a hand with ${domain}?`,
  text: `${greeting(name)}

${domain} still isn't sending data to Rybbit. I won't keep nudging you - this is the last one.

If you hit a technical wall, reply with your platform (WordPress, Next.js, Shopify...) and I'll send you exact instructions. If you decided Rybbit isn't for you, I'd honestly love to know why.

Either way, thanks for giving us a try.${signoff}`,
});

// ---------------------------------------------------------------------------
// Stage 3: data flowing
// ---------------------------------------------------------------------------

export const siteLive = (domain: string, siteId: number, country: string | null, name?: string | null): LifecycleEmail => ({
  subject: `Rybbit is live on ${domain}`,
  text: `${greeting(name)}

Rybbit just received its first pageview from ${domain}${country ? ` - a visitor from ${country}` : ""}. Everything is working.

Watch your traffic live: ${appUrl()}/${siteId}

Let it collect data for a couple of days, then I'll send you the first patterns worth looking at.${signoff}`,
});

export interface FirstDaysStats {
  sessions: number;
  pageviews: number;
  topReferrer: string | null;
  topPage: string | null;
}

export const firstDays = (domain: string, siteId: number, stats: FirstDaysStats, name?: string | null): LifecycleEmail => ({
  subject: `Your first days of data on ${domain}`,
  text: `${greeting(name)}

${domain} has been on Rybbit for a few days. So far:

- ${stats.sessions.toLocaleString()} visit${stats.sessions === 1 ? "" : "s"}, ${stats.pageviews.toLocaleString()} pageview${stats.pageviews === 1 ? "" : "s"}${
    stats.topReferrer ? `\n- Top source: ${stats.topReferrer}` : ""
  }${stats.topPage ? `\n- Most viewed page: ${stats.topPage}` : ""}

One thing worth knowing: adblockers hide roughly 10-30% of real visitors from Google Analytics, but they rarely block Rybbit. If these numbers look higher than what you're used to, that's your actual traffic.

See the full picture: ${appUrl()}/${siteId}${signoff}`,
});

export const nudgeEvents = (domain: string, siteId: number, name?: string | null): LifecycleEmail => ({
  subject: `See what visitors actually do on ${domain}`,
  text: `${greeting(name)}

Pageviews tell you where people go. Custom events tell you what they do - button clicks, signups, downloads. One line:

window.rybbit.event("signup_clicked")

Or straight from HTML, no code:

<button data-rybbit-event="signup_clicked">Sign up</button>

Events show up on your dashboard and work as funnel steps and goals.

Guide: https://rybbit.com/docs/track-events${signoff}`,
});

export const nudgeGoals = (domain: string, siteId: number, convertingPath: string, name?: string | null): LifecycleEmail => ({
  subject: `Visitors are reaching ${convertingPath} - measure it`,
  text: `${greeting(name)}

Visitors on ${domain} are landing on ${convertingPath}. That looks like a conversion - worth measuring properly.

Set a goal on that path and Rybbit shows your conversion rate broken down by source, country, and device. Funnels go further: define the steps leading up to it and see exactly where people drop off.

Create your first goal: ${appUrl()}/${siteId}/goals

Guide: https://rybbit.com/docs/goals${signoff}`,
});

// ---------------------------------------------------------------------------
// Stage 4: went quiet
// ---------------------------------------------------------------------------

export const wentQuiet = (domain: string, siteId: number, lastEventAt: string, name?: string | null): LifecycleEmail => ({
  subject: `We stopped hearing from ${domain}`,
  text: `${greeting(name)}

${domain} was sending data to Rybbit, but we haven't received anything since ${lastEventAt}. If you redeployed recently, the tracking snippet may have been dropped from the new build - that's the usual cause.

Check that the snippet is still in your <head>, or see your dashboard: ${appUrl()}/${siteId}

If you removed it on purpose, ignore this - I won't email about it again.${signoff}`,
});
