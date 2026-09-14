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

const overflowLine = (total: number, noun: string) => {
  const hidden = total - MAX_LISTED_SITES;
  return hidden > 0 ? `\n...and ${hidden} more ${noun}${hidden === 1 ? "" : "s"}.` : "";
};

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

export interface SnippetSite {
  domain: string;
  siteId: number;
  platform: PlatformInfo | null;
}

export const installSnippet = (sitesIn: SnippetSite[], name?: string | null): LifecycleEmail => {
  const domains = sitesIn.map(s => s.domain);
  if (sitesIn.length === 1) {
    const [{ domain, siteId, platform }] = sitesIn;
    return {
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
    };
  }

  const listed = sitesIn
    .slice(0, MAX_LISTED_SITES)
    .map(s => `${s.domain}${s.platform ? ` (${s.platform.label}: ${s.platform.guideUrl})` : ""}\n${snippetFor(s.siteId)}`)
    .join("\n\n");
  return {
    subject: `One step left for ${subjectDomains(domains)}`,
    text: `${greeting(name)}

You've added ${sitesIn.length} sites to Rybbit - each one just needs its tracking snippet in the <head> of every page. The snippets differ only by site id:

${listed}${overflowLine(sitesIn.length, "site")}

Every site's snippet is also on its dashboard under Settings. Framework and CMS guides: https://rybbit.com/docs/script

As soon as the first pageview arrives you'll see it live on your dashboard. If something isn't working, reply and I'll help you debug it.${signoff}`,
  };
};

export interface CheckSite {
  domain: string;
  checkInstallUrl: string;
}

export const installCheck = (sitesIn: CheckSite[], name?: string | null): LifecycleEmail => {
  const domains = sitesIn.map(s => s.domain);
  if (sitesIn.length === 1) {
    const [{ domain, checkInstallUrl }] = sitesIn;
    return {
      subject: `Still nothing from ${domain}`,
      text: `${greeting(name)}

Your Rybbit snippet hasn't sent any data from ${domain} yet. The three most common causes:

1. The snippet isn't in the <head> of the deployed site (check view-source on the live page)
2. The site hasn't been redeployed since you added it
3. An adblocker on your own browser is blocking your test visit - try a private window

Click here and we'll fetch ${domain} right now and tell you whether the snippet is there:
${checkInstallUrl}

Stuck? Reply to this email and I'll take a look personally.${signoff}`,
    };
  }

  const listed = sitesIn
    .slice(0, MAX_LISTED_SITES)
    .map(s => `${s.domain}\n${s.checkInstallUrl}`)
    .join("\n\n");
  return {
    subject: `Still nothing from ${subjectDomains(domains)}`,
    text: `${greeting(name)}

Your Rybbit snippets haven't sent any data from ${sitesIn.length} of your sites yet. The three most common causes:

1. The snippet isn't in the <head> of the deployed site (check view-source on the live page)
2. The site hasn't been redeployed since you added it
3. An adblocker on your own browser is blocking your test visit - try a private window

Click a link and we'll fetch that site right now and tell you whether the snippet is there:

${listed}${overflowLine(sitesIn.length, "site")}

Stuck? Reply to this email and I'll take a look personally.${signoff}`,
  };
};

export const installFinal = (domains: string[], name?: string | null): LifecycleEmail => {
  const single = domains.length === 1;
  const which = single ? domains[0] : `${domains.length} of your sites`;
  const listed = single ? "" : `\n\n${domains.slice(0, MAX_LISTED_SITES).join("\n")}${overflowLine(domains.length, "site")}`;
  return {
    subject: `Need a hand with ${subjectDomains(domains)}?`,
    text: `${greeting(name)}

${which} still ${single ? "isn't" : "aren't"} sending data to Rybbit.${listed}

I won't keep nudging you - this is the last one.

If you hit a technical wall, reply with your platform (WordPress, Next.js, Shopify...) and I'll send you exact instructions. If you decided Rybbit isn't for you, I'd honestly love to know why.

Either way, thanks for giving us a try.${signoff}`,
  };
};

// ---------------------------------------------------------------------------
// Stage 3: data flowing
// ---------------------------------------------------------------------------

export interface LiveSite {
  domain: string;
  siteId: number;
}

export const siteLive = (sitesIn: LiveSite[], country: string | null, name?: string | null): LifecycleEmail => {
  const domains = sitesIn.map(s => s.domain);
  if (sitesIn.length === 1) {
    const [{ domain, siteId }] = sitesIn;
    return {
      subject: `Rybbit is live on ${domain}`,
      text: `${greeting(name)}

Rybbit just received its first pageview from ${domain}${country ? ` - a visitor from ${country}` : ""}. Everything is working.

Watch your traffic live: ${appUrl()}/${siteId}

Let it collect data for a couple of days, then I'll send you the first patterns worth looking at.${signoff}`,
    };
  }

  const listed = sitesIn
    .slice(0, MAX_LISTED_SITES)
    .map(s => `${s.domain}: ${appUrl()}/${s.siteId}`)
    .join("\n");
  return {
    subject: `Rybbit is live on ${subjectDomains(domains)}`,
    text: `${greeting(name)}

Rybbit has received its first pageviews from ${sitesIn.length} of your sites. Everything is working.

${listed}${overflowLine(sitesIn.length, "site")}

Let them collect data for a couple of days, then I'll send you the first patterns worth looking at.${signoff}`,
  };
};

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
      subject: `We stopped hearing from ${domain}`,
      text: `${greeting(name)}

${domain} was sending data to Rybbit, but we haven't received anything since ${lastEventAt}. If you redeployed recently, the tracking snippet may have been dropped from the new build - that's the usual cause.

Check that the snippet is still in your <head>, or see your dashboard: ${appUrl()}/${siteId}

If you removed it on purpose, ignore this - I won't email about it again.${signoff}`,
    };
  }

  const listed = sitesIn
    .slice(0, MAX_LISTED_SITES)
    .map(s => `${s.domain} - last event ${s.lastEventAt}: ${appUrl()}/${s.siteId}`)
    .join("\n");
  return {
    subject: `We stopped hearing from ${subjectDomains(domains)}`,
    text: `${greeting(name)}

${sitesIn.length} of your sites were sending data to Rybbit, but we haven't received anything from them for two days or more:

${listed}${overflowLine(sitesIn.length, "site")}

If you redeployed recently, the tracking snippet may have been dropped from the new build - that's the usual cause. Check that the snippet is still in each site's <head>.

If you removed it on purpose, ignore this - I won't email about these sites again.${signoff}`,
  };
};
