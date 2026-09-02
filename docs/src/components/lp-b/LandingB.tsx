import { AgentConsole } from "@/components/Cards/AgentConsole";
import { CTASection } from "@/components/CTASection";
import { ConsoleGreeting } from "@/components/deco/ConsoleGreeting";
import { TrackingSnippet } from "@/components/deco/TrackingSnippet";
import { customerLogos } from "@/components/customerLogos";
import { platforms } from "@/components/Integration";
import { FaqB } from "@/components/lp-b/FaqB";
import { HeroPlate } from "@/components/lp-b/HeroPlate";
import {
  CONTAINER,
  DemoButton,
  Panel,
  PanelCopy,
  SectionTitle,
  SignupButton,
  TextLink,
} from "@/components/lp-b/primitives";
import { PricingB } from "@/components/lp-b/PricingB";
import { FunnelVisual } from "@/components/lp-b/visuals/FunnelVisual";
import { JourneyVisual } from "@/components/lp-b/visuals/JourneyVisual";
import { ReplayVisual } from "@/components/lp-b/visuals/ReplayVisual";
import { SessionsVisual } from "@/components/lp-b/visuals/SessionsVisual";
import { VitalsVisual } from "@/components/lp-b/visuals/VitalsVisual";
import { TweetCard } from "@/components/Tweet";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { cn } from "@/lib/utils";
import { Globe, Lock } from "lucide-react";
import { useExtracted } from "next-intl";
import Image from "next/image";
import Link from "next/link";

const mcpClients = [
  { name: "Claude Code", path: "/docs/mcp/claude-code" },
  { name: "Claude Desktop", path: "/docs/mcp/claude-desktop" },
  { name: "Codex", path: "/docs/mcp/codex" },
  { name: "Cursor", path: "/docs/mcp/cursor" },
  { name: "VS Code", path: "/docs/mcp/vscode" },
  { name: "opencode", path: "/docs/mcp/opencode" },
];

// Eleven of the 35 integrations; the twelfth tile links to the rest.
const featuredPlatforms = [
  "Next.js",
  "React",
  "Vue",
  "Svelte",
  "Angular",
  "Nuxt",
  "WordPress",
  "Shopify",
  "Webflow",
  "GTM",
  "Laravel",
]
  .map(name => platforms.find(p => p.name === name))
  .filter((p): p is (typeof platforms)[number] => Boolean(p));

// Six posts that describe the cloud product accurately (no self-hosting, no "free tier").
const tweetIds = [
  "1927817460993884321",
  "1970265809122705759",
  "1991296442611184125",
  "1982378431166963982",
  "1920470706761929048",
  "1921928423284629758",
];

// Mirrors FaqB, for search engines.
const faqBSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    [
      "Is Rybbit GDPR and CCPA compliant?",
      "Yes, Rybbit is fully compliant with GDPR, CCPA, and other privacy regulations. We don't use cookies or collect any personal data that could identify your users. We salt user IDs daily to ensure users are not fingerprinted. You will not need to display a cookie consent banner to your users.",
    ],
    [
      "How does Rybbit compare to Google Analytics?",
      "It's one dashboard instead of 150+ reports, and the script is 18 KB against GA4's 371 KB.",
    ],
    [
      "Where is my data stored?",
      "On Rybbit Cloud, hosted in European data centers. Rybbit runs the infrastructure, updates, scaling and backups. You add the script and read the dashboard.",
    ],
    [
      "How easy is it to set up Rybbit?",
      "Add one script tag to your site, or install @rybbit/js from npm. Most sites are collecting data in under 5 minutes.",
    ],
    [
      "What platforms does Rybbit support?",
      "The script tag works anywhere you can add HTML: WordPress, Shopify, Next.js, React, Vue, and the rest. For apps, install @rybbit/js from npm.",
    ],
    [
      "Is Rybbit truly open source?",
      "Yes. Every line of code, including the cloud and enterprise features, is on GitHub under the AGPL 3.0 license.",
    ],
    [
      "Can I invite my team to my organization?",
      "Yes, you can invite unlimited team members to your organization. Each member can have different permission levels to view or manage your analytics dashboards.",
    ],
    [
      "Does Rybbit have an API?",
      "Yes. The Rybbit API exposes every metric the dashboard shows over HTTP, so you can pull your data into your own apps, dashboards, or workflows.",
    ],
  ].map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })),
};

/**
 * Homepage redesign, variant B ("Quiet Editorial"): left-aligned hero over
 * the live demo on a traffic-landscape plate, then alternating panels that
 * each pair a paragraph with a working product visual, ending in the green
 * CTA band. Cloud-first: it never mentions self-hosting.
 */
export function LandingB() {
  const t = useExtracted();

  const privacyCards = [
    {
      icon: Lock,
      title: t("Cookieless, by design"),
      description: t(
        "No cookies, no fingerprinting, and user IDs salted daily. GDPR and CCPA are covered, with nothing for visitors to consent to."
      ),
      href: "/privacy",
      link: t("How privacy works"),
    },
    {
      icon: Globe,
      title: t("Hosted in the EU"),
      description: t(
        "Rybbit Cloud runs in European data centers. Infrastructure, updates, scaling and backups are handled for you."
      ),
      href: "/pricing",
      link: t("See the plans"),
    },
    {
      icon: SiGithub,
      title: t("Open source, AGPL 3.0"),
      description: t("Every line, including the cloud and enterprise features, is on GitHub. No open-core surprises."),
      href: "https://github.com/rybbit-io/rybbit",
      link: t("Read the source"),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqBSchema) }} />
      <ConsoleGreeting />
      <div className="overflow-clip bg-white text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
        {/* Hero */}
        <section className={cn(CONTAINER, "flex flex-col gap-6 pt-16 md:pt-24")}>
          <h1 className="max-w-[900px] text-[clamp(2.25rem,4.2vw,3.25rem)] font-medium leading-[1.12] tracking-[-0.035em] text-balance">
            {t("Rybbit is the cookieless replacement for Google Analytics.")}
          </h1>
          {/* <p className="max-w-[60ch] text-base leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-lg text-pretty">
            {t(
              "Web and product analytics on one dashboard: visitors, sessions, funnels, replays, web vitals and errors. One 18 KB script, no cookie banner, live in minutes."
            )}
          </p> */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <SignupButton location="hero_b" label={t("Start free trial")} />
            <DemoButton location="hero_b" label={t("Live demo")} />
          </div>
          {/* <p className="-mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {t("7-day free trial. No credit card charges until the trial ends.")}
          </p> */}
        </section>

        <section className={cn(CONTAINER, "mt-12 md:mt-14")} aria-label={t("Live demo of the Rybbit dashboard")}>
          <HeroPlate />
        </section>

        {/* Customers */}
        <section className={cn(CONTAINER, "mt-16 flex flex-col items-center gap-5 md:mt-20")}>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t("Trusted by teams at")}</p>
          <div className="grid w-full grid-cols-2 overflow-hidden rounded-[10px] border border-neutral-200 dark:border-neutral-800 sm:grid-cols-4 lg:grid-cols-8">
            {customerLogos.map((logo, index) => {
              const image = (
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={logo.width}
                  height={40}
                  className={`max-h-7 w-auto max-w-[112px] transition-opacity duration-200 ${logo.className}`}
                />
              );
              return (
                <div
                  key={logo.alt}
                  className={cn(
                    "flex min-h-[88px] items-center justify-center border-neutral-200 dark:border-neutral-800",
                    index % 2 === 1 && "border-l",
                    index >= 2 && "border-t sm:border-t-0",
                    index % 4 !== 0 && "sm:border-l",
                    index >= 4 && "sm:border-t lg:border-t-0",
                    index % 8 !== 0 && "lg:border-l"
                  )}
                >
                  {logo.href ? (
                    <Link href={logo.href} target="_blank" rel="noopener noreferrer" aria-label={logo.alt}>
                      {image}
                    </Link>
                  ) : (
                    image
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Feature panels */}
        <div className={cn(CONTAINER, "mt-20 flex flex-col gap-6 md:mt-24")}>
          <Panel>
            <PanelCopy
              title={t("See the session behind the number.")}
              description={t(
                "Every chart links to the sessions that made it. Open one and watch the replay, with clicks, scrolls, console errors and rage-clicks on the timeline."
              )}
              links={[{ href: "/features/session-replay", label: t("Learn about session replay") }]}
            />
            <ReplayVisual />
          </Panel>

          <Panel visualFirst>
            <PanelCopy
              title={t("Measure what converts, and where it drops.")}
              description={t(
                "Define a funnel in seconds, follow the paths visitors actually take, and set goals on pages or events. Retention shows whether they come back."
              )}
              links={[
                { href: "/features/funnels", label: t("Learn about funnels") },
                { href: "/features/user-journeys", label: t("User journeys") },
              ]}
            />
            <div className="flex flex-col gap-4">
              <FunnelVisual />
              <JourneyVisual />
            </div>
          </Panel>

          <Panel>
            <PanelCopy
              title={t("Every session, and the person behind it.")}
              description={t(
                "Browse each session with its device, browser, location and full event timeline, then filter with a click. Identify a user once and Rybbit links their whole history, from anonymous first visit to latest session."
              )}
              links={[
                { href: "/features/user-profiles", label: t("Learn about user profiles") },
                { href: "/features/sessions", label: t("Browse sessions") },
              ]}
            />
            <SessionsVisual />
          </Panel>

          <Panel visualFirst>
            <PanelCopy
              title={t("How fast your site is, for real visitors.")}
              description={t(
                "Core Web Vitals measured from actual sessions, not lab runs. LCP, INP and CLS at every percentile, broken down by page, device and country, so you fix what is actually slow."
              )}
              links={[
                { href: "/features/web-vitals", label: t("Learn about web vitals") },
                { href: "/features/error-tracking", label: t("Error tracking") },
              ]}
            />
            <VitalsVisual />
          </Panel>

          <Panel>
            <PanelCopy
              title={t("In every stack, at every step.")}
              description={t(
                "One script tag, or the npm package for apps. Most sites are collecting data in under five minutes, with no build step and no cookie banner."
              )}
              links={[{ href: "/docs/script", label: t("Read the install docs") }]}
            />
            <div className="flex flex-col gap-5">
              <TrackingSnippet />
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
                {featuredPlatforms.map(platform => {
                  const Icon = platform.icon;
                  return (
                    <Link
                      key={platform.name}
                      href={platform.path}
                      className="flex flex-col items-center gap-2 rounded-lg border border-neutral-200 bg-white px-1.5 py-3.5 text-neutral-600 transition-colors duration-200 hover:border-neutral-300 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-neutral-800 dark:bg-[#0f0f0f] dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-white"
                    >
                      <Icon className="size-[22px]" />
                      <span className="text-[11px]">{platform.name}</span>
                    </Link>
                  );
                })}
                <Link
                  href="/docs"
                  className="flex items-center justify-center rounded-lg border border-dashed border-neutral-300 px-1.5 py-3.5 text-[11px] text-neutral-500 transition-colors duration-200 hover:border-neutral-400 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-white"
                >
                  {t("+ {count} more", { count: String(platforms.length - featuredPlatforms.length) })}
                </Link>
              </div>
            </div>
          </Panel>

          <Panel visualFirst>
            <div className="flex flex-col justify-center gap-5">
              <h2 className="max-w-[16ch] text-[28px] font-medium leading-[1.15] tracking-[-0.03em] md:text-[34px] text-balance">
                {t("Analytics your AI can operate.")}
              </h2>
              <p className="max-w-[44ch] text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                {t(
                  "A hosted MCP server on top of Rybbit's full REST API. Your agent reads live traffic, debugs errors, and manages goals, with the same permissions as a teammate."
                )}
              </p>
              <ul className="flex flex-wrap gap-2">
                {mcpClients.map(client => (
                  <li key={client.name}>
                    <Link
                      href={client.path}
                      className="inline-flex h-7 items-center rounded-md border border-neutral-200 px-2.5 text-xs font-medium text-neutral-600 transition-colors duration-200 hover:border-neutral-300 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-white"
                    >
                      {client.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                <TextLink href="/docs/mcp">{t("Set up MCP")}</TextLink>
                <TextLink href="/docs/api/getting-started" muted>
                  {t("API reference")}
                </TextLink>
              </div>
            </div>
            <AgentConsole grid={false} />
          </Panel>
        </div>

        {/* Testimonials */}
        <section className={cn(CONTAINER, "mt-24 md:mt-32")} aria-labelledby="lp-b-testimonials">
          <SectionTitle
            id="lp-b-testimonials"
            title={t("The quiet way to know your traffic.")}
            description={t("Real posts from people who switched.")}
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tweetIds.map(id => (
              <TweetCard key={id} id={id} />
            ))}
          </div>
        </section>

        {/* Privacy */}
        <section className={cn(CONTAINER, "mt-24 md:mt-32")} aria-labelledby="lp-b-privacy">
          <SectionTitle id="lp-b-privacy" title={t("Private by default")} />
          <div className="grid gap-4 md:grid-cols-3">
            {privacyCards.map(card => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-7 dark:border-neutral-800 dark:bg-[#131313]"
                >
                  <Icon className="size-[22px] text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <h3 className="text-lg font-medium tracking-[-0.02em]">{card.title}</h3>
                  <p className="flex-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                    {card.description}
                  </p>
                  <TextLink href={card.href}>{card.link}</TextLink>
                </div>
              );
            })}
          </div>
        </section>

        {/* Pricing */}
        <section className={cn(CONTAINER, "mt-24 md:mt-32")} aria-labelledby="lp-b-pricing">
          <PricingB />
        </section>

        {/* FAQ */}
        <section
          className={cn(CONTAINER, "mt-24 grid gap-10 md:mt-32 lg:grid-cols-[1fr_1.6fr] lg:gap-16")}
          aria-labelledby="lp-b-faq"
        >
          <div className="flex flex-col gap-3">
            <h2 id="lp-b-faq" className="text-[30px] font-medium leading-[1.1] tracking-[-0.03em] md:text-[36px]">
              {t("Questions, answered plainly.")}
            </h2>
            <p className="text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
              {t("The questions people ask before adding Rybbit to their site.")}
            </p>
          </div>
          <FaqB />
        </section>

        <div className="mt-24 md:mt-32">
          <CTASection eventLocation="bottom_cta_b" />
        </div>
      </div>
    </>
  );
}
