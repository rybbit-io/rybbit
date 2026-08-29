import { GitHubStarButton } from "@/components/GitHubStarButton";
import { TrackedButton } from "@/components/TrackedButton";
import { cn } from "@/lib/utils";
import { ArrowRight, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

/**
 * Shared material for the three landing-page redesign candidates at /lp/a,
 * /lp/b and /lp/c.
 *
 * i18n: these pages are English-only preview builds behind `robots: noindex`
 * (see lp/layout.tsx), so the copy here is plain literals rather than
 * `useExtracted()` calls. Wrapping new literals in `t()` would make the dev
 * extractor write empty keys into all ten locale files, which render blank —
 * translate whichever variant wins, once it wins.
 *
 * Copy is deliberately identical across the three variants: the A/B test is
 * meant to isolate structure, not wording.
 */

export const LP_TITLE = "The Modern Google Analytics Replacement";

export const LP_SUBTITLE =
  "Rybbit is open-source, cookieless analytics: one readable dashboard and an 18 KB script. No consent banner needed, GDPR and CCPA compliant.";

export const LP_META_DESCRIPTION =
  "Open source, cookieless web & product analytics with an 18 KB script and one readable dashboard. GDPR/CCPA compliant, no cookie banner needed.";

/** Variant key, used to namespace conversion events so the test can attribute. */
export type LpVariant = "a" | "b" | "c";

export const DEMO_SITE_URL = "https://demo.rybbit.com/81";
export const SIGNUP_URL = "https://app.rybbit.io/signup";

/* ── EU flag ─────────────────────────────────────────────────────────────
   Copied from HeroSection rather than exported from it: the hero owns its
   own layout and these variants only need the mark. */
export function EUFlag() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 767 512"
      role="img"
      aria-label="European flag"
      className="h-4 w-6 shrink-0 rounded-[2px]"
    >
      <title>European flag</title>
      <path className="fill-[#233E90]" d="M766 1H1v510h765V1Z" />
      <path
        className="fill-yellow-400"
        d="m387 117-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm114 43-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm47 125-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm-321 0-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm283 125-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm-123 35-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm-123-35-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm0-250-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Z"
      />
    </svg>
  );
}

/* ── Hero calls to action ────────────────────────────────────────────────
   Event location is namespaced per variant (`hero_lp_a`, …) so signups can
   be attributed to the design they came from once the test is running. */
export function HeroCtas({
  variant,
  className,
  placement = "hero",
}: {
  variant: LpVariant;
  className?: string;
  /** Distinguishes the hero pair from the closing pair in event attribution. */
  placement?: "hero" | "bottom_cta";
}) {
  const location = `${placement}_lp_${variant}`;
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row", className)}>
      <TrackedButton
        href={SIGNUP_URL}
        eventName="signup"
        eventProps={{ location, button_text: "get started" }}
        className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
      >
        Start for $0
        <ArrowRight
          className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </TrackedButton>
      <TrackedButton
        href={DEMO_SITE_URL}
        eventName="demo"
        target="_blank"
        rel="noopener noreferrer"
        eventProps={{ location, button_text: "Live demo" }}
        className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-900 transition-colors duration-200 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-900 dark:focus-visible:ring-offset-neutral-950"
      >
        Live demo
        <ExternalLink
          className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </TrackedButton>
    </div>
  );
}

export function GitHubStar() {
  return <GitHubStarButton />;
}

export function EuNote({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400",
        className
      )}
    >
      <EUFlag />
      <span>EU-hosted cloud</span>
    </div>
  );
}

/* ── Customer logos ──────────────────────────────────────────────────────
   Same set as the production landing page. Every SVG in /public/logos is
   pure white, so it inverts to black in light mode and renders as-is in dark. */
const whiteSvgLogo = "opacity-40 hover:opacity-70 invert dark:opacity-60 dark:hover:opacity-100 dark:invert-0";

export const customerLogos = [
  { src: "/logos/bosch.svg", alt: "Bosch", width: 120, className: whiteSvgLogo },
  { src: "/logos/texas-instruments.svg", alt: "Texas Instruments", width: 120, className: whiteSvgLogo },
  { src: "/logos/govuk-logo.svg", alt: "GOV.UK", width: 120, className: whiteSvgLogo },
  { src: "/logos/royalcaribbean.svg", alt: "Royal Caribbean", width: 120, className: whiteSvgLogo },
  { src: "/logos/netapp.svg", alt: "NetApp", width: 120, className: whiteSvgLogo },
  { src: "/logos/obelinf.svg", alt: "Obelinf", width: 120, className: whiteSvgLogo, href: "https://obelinf.com" },
  { src: "/logos/op.svg", alt: "OP.GG", width: 120, className: whiteSvgLogo },
  {
    src: "/logos/automatio.webp",
    alt: "Automatio",
    width: 140,
    href: "https://automatio.ai",
    className: "opacity-50 hover:opacity-80 grayscale invert dark:opacity-70 dark:hover:opacity-100 dark:invert-0",
  },
];

/** A single unruled row of customer logos — no cells, no seams. */
export function LogoRow({ className, align = "center" }: { className?: string; align?: "center" | "start" }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-8 gap-y-6 sm:gap-x-10",
        align === "center" ? "justify-center" : "justify-start",
        className
      )}
    >
      {customerLogos.map(logo => {
        const image = (
          <Image
            src={logo.src}
            alt={logo.alt}
            width={logo.width}
            height={40}
            className={`max-h-7 w-auto max-w-full transition-opacity duration-200 ${logo.className}`}
          />
        );
        /* The fixed-width wrapper is load-bearing, not cosmetic. Two of these
           SVGs carry an aspect ratio but no intrinsic size (royalcaribbean is
           width/height="100%"; texas-instruments' width/height disagree with
           its viewBox), and inside a shrink-to-fit box Chrome resolves such an
           image to 0x0 — they silently vanish from the row. Giving the wrapper
           a definite width fixes both while leaving `max-h-7` to govern each
           logo's optical size, so the row keeps the production page's ragged,
           natural rhythm rather than a forced uniform height. */
        return (
          <span key={logo.alt} className="block w-24 shrink-0">
            {logo.href ? (
              <Link href={logo.href} target="_blank" rel="noopener noreferrer" aria-label={logo.alt}>
                {image}
              </Link>
            ) : (
              image
            )}
          </span>
        );
      })}
    </div>
  );
}

/* ── Capability index ────────────────────────────────────────────────────
   The same twenty links the production page carries. This band is the page's
   internal-link hub as well as the evaluator's checklist, so all three
   variants keep it — only its presentation changes. */
export const capabilityIndex = [
  {
    title: "Understand",
    links: [
      { label: "Realtime data", href: "/features/web-analytics" },
      { label: "Web vitals", href: "/features/web-vitals" },
      { label: "Globe views", href: "/docs/feature-guides/globe" },
      { label: "Email reports", href: "/docs/account-settings" },
      { label: "Setup in minutes", href: "/docs/script" },
    ],
  },
  {
    title: "Investigate",
    links: [
      { label: "Session replay", href: "/features/session-replay" },
      { label: "User journeys", href: "/features/user-journeys" },
      { label: "User profiles", href: "/features/user-profiles" },
      { label: "Error tracking", href: "/features/error-tracking" },
      { label: "Organizations", href: "/docs/teams" },
    ],
  },
  {
    title: "Measure",
    links: [
      { label: "Funnels", href: "/features/funnels" },
      { label: "Goals", href: "/features/goals" },
      { label: "Retention", href: "/features/retention" },
      { label: "Custom events", href: "/features/custom-events" },
      { label: "API & data export", href: "/docs/api/getting-started" },
    ],
  },
  {
    title: "Stay private",
    links: [
      { label: "No cookies", href: "/privacy" },
      { label: "GDPR & CCPA", href: "/dpa" },
      { label: "Bot blocking", href: "/docs/bot-detection" },
      { label: "Self-hosting", href: "/docs/self-hosting" },
      { label: "Open source", href: "https://github.com/rybbit-io/rybbit", external: true },
    ],
  },
];

export const mcpClients = [
  { name: "Claude Code", path: "/docs/mcp/claude-code" },
  { name: "Claude Desktop", path: "/docs/mcp/claude-desktop" },
  { name: "Codex", path: "/docs/mcp/codex" },
  { name: "Cursor", path: "/docs/mcp/cursor" },
  { name: "VS Code", path: "/docs/mcp/vscode" },
  { name: "opencode", path: "/docs/mcp/opencode" },
];

/** Tweet ids, matching the production page. Only claims that are accurate. */
export const tweetColumns = [
  ["1991296442611184125", "1921928423284629758", "2000974573005889706", "1927817460993884321"],
  ["1920899082253434950", "2000788904778326334", "1976495558480232672", "1977471983278535071"],
  ["1982378431166963982", "2009548405488615871", "1920470706761929048", "1979830490006974510", "1970265809122705759"],
];

export const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is Rybbit GDPR and CCPA compliant?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Rybbit is fully compliant with GDPR, CCPA, and other privacy regulations. We don't use cookies or collect any personal data that could identify your users. We salt user IDs daily to ensure users are not fingerprinted. You will not need to display a cookie consent banner to your users.",
      },
    },
    {
      "@type": "Question",
      name: "How does Rybbit compare to Google Analytics?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Rybbit is far less bloated than Google Analytics, both in the tracking script and the dashboard. It's one dashboard instead of 150+ reports, and the script is 18KB against GA4's 371KB.",
      },
    },
    {
      "@type": "Question",
      name: "Can I self-host Rybbit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. You can run Rybbit on your own server with Docker and keep full control of your data, or use the managed cloud if you'd rather not host it yourself.",
      },
    },
    {
      "@type": "Question",
      name: "How easy is it to set up Rybbit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Add one script tag to your site, or install @rybbit/js from npm. Most sites are collecting data in under 5 minutes.",
      },
    },
    {
      "@type": "Question",
      name: "What platforms does Rybbit support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The script tag works anywhere you can add HTML: WordPress, Shopify, Next.js, React, Vue, and the rest. For apps, install @rybbit/js from npm.",
      },
    },
    {
      "@type": "Question",
      name: "Is Rybbit truly open source?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Rybbit is 100% open source. Every single line of code, including for our cloud/enterprise offerings, is available on GitHub under the AGPL 3.0 license.",
      },
    },
  ],
};

/* ── Live demo embed ─────────────────────────────────────────────────────
   md+ renders the demo at a 117.6% viewport and scales it to 0.85 so the full
   desktop layout fits at preview size; the two values must stay reciprocal.
   Mobile stays 1:1 — a scaled viewport lands between the demo's breakpoints. */
export function DemoEmbed({
  route = "main",
  className,
  title = "Rybbit Analytics Demo",
  loading = "lazy",
}: {
  route?: string;
  className?: string;
  title?: string;
  /** Each embed is a full app load; only the above-the-fold one should be eager. */
  loading?: "eager" | "lazy";
}) {
  return (
    <iframe
      src={`${DEMO_SITE_URL}/${route}`}
      title={title}
      loading={loading}
      className={cn(
        "block h-full w-full border-none md:h-[117.6%] md:w-[117.6%] md:origin-top-left md:scale-[0.85]",
        className
      )}
    />
  );
}

/**
 * The demo embed with a scrim fading its lower edge into the page. Used where
 * the screenshot should read as continuing past the fold rather than being
 * cropped by a frame. The scrim is `pointer-events-none`, so the embed stays
 * scrollable and clickable underneath it.
 */
export function DemoEmbedFading({
  route = "main",
  heightClassName,
  scrimHeightClassName = "h-40",
  scrimClassName = "from-white dark:from-neutral-950",
  sideScrim = false,
  loading = "lazy",
}: {
  route?: string;
  heightClassName: string;
  /** A frameless embed needs a long fade; a bordered one needs much less. */
  scrimHeightClassName?: string;
  scrimClassName?: string;
  /**
   * Fade the left and right edges too. Without a frame the embed otherwise
   * reads as an unexplained lighter rectangle — the demo app paints its own
   * #141414 canvas, a step off the marketing page's near-black.
   */
  sideScrim?: boolean;
  loading?: "eager" | "lazy";
}) {
  return (
    <div className={cn("relative min-w-0 max-w-full overflow-hidden", heightClassName)}>
      <DemoEmbed route={route} loading={loading} />
      {sideScrim && (
        <>
          <div
            aria-hidden="true"
            className={cn("pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r to-transparent sm:w-24", scrimClassName)}
          />
          <div
            aria-hidden="true"
            className={cn("pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l to-transparent sm:w-24", scrimClassName)}
          />
        </>
      )}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent",
          scrimHeightClassName,
          scrimClassName
        )}
      />
    </div>
  );
}
