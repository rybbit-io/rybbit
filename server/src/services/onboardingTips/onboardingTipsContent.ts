export interface OnboardingTipContent {
  day: number;
  subject: string;
  body: string;
  linkText?: string;
  linkUrl?: string;
}

export const ONBOARDING_TIPS: OnboardingTipContent[] = [
  {
    day: 1,
    subject: "You made the right choice",
    body: `Thanks for signing up for Rybbit. You've joined thousands of developers who care about respecting their users' privacy.

Unlike traditional analytics tools, Rybbit doesn't use cookies, doesn't track users across websites, and doesn't sell your data to advertisers. Your visitors stay anonymous, and you still get the insights you need.

We built Rybbit because we were tired of tools that treat users as products. Privacy shouldn't mean giving up on understanding your audience.

If you're curious how we compare to other tools, check out our comparison page.`,
    linkText: "View comparison",
    linkUrl: "https://rybbit.com/docs/comparison",
  },
  {
    day: 2,
    subject: "Why your metrics might look different than GA",
    body: `If you've been using Google Analytics before, you might notice your Rybbit numbers look different. That's actually a good thing.

Adblockers block Google Analytics. They rarely block Rybbit. So for the first time, you're probably seeing your real traffic - and it's likely higher than GA ever showed you.

We're also lightweight and privacy-focused, which means browsers and privacy tools treat us differently than traditional trackers.

Those missing visitors in GA? They were always there. You just couldn't see them.`,
  },
  {
    day: 3,
    subject: "Track what matters with custom events",
    body: `Pageviews tell you what pages people visit. Custom events tell you what they actually do.

Track button clicks, form submissions, video plays - anything that matters to your business. It's one line of code:

window.rybbit.event("signup_clicked")

Or use data attributes directly in your HTML:

<button data-rybbit-event="signup_clicked">Sign Up</button>

Events show up in your dashboard and can be used as funnel steps or goal triggers.`,
    linkText: "Read the full guide",
    linkUrl: "https://rybbit.com/docs/track-events",
  },
  {
    day: 4,
    subject: "Turn pageviews into insights",
    body: `Raw traffic numbers are interesting, but conversions are what matter.

Goals let you track specific outcomes - signups, purchases, downloads. Set a goal for "/thank-you" and see how many visitors actually convert, broken down by source, device, and more.

Funnels go deeper. Define a multi-step process (view product -> add to cart -> checkout -> purchase) and see exactly where users drop off. Finding a 60% drop-off at checkout? Now you know where to focus.`,
    linkText: "Set up your first goal",
    linkUrl: "https://rybbit.com/docs/web-analytics/goals-tab",
  },
  {
    day: 5,
    subject: "Build with your data",
    body: `Everything in your Rybbit dashboard is available through our API.

Build custom dashboards, set up alerts when traffic spikes, pipe data into your own tools, create reports for clients - the data is yours to use however you want.

Authentication is simple (API key in header), and the endpoints mirror what you see in the UI. Query pageviews, events, sessions, funnels - whatever you need.`,
    linkText: "Get started with the API",
    linkUrl: "https://rybbit.com/docs/api/getting-started",
  },
];
