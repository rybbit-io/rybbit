import { GridCrosses } from "@/components/GridCrosses";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { SiDiscord, SiGithub, SiX } from "@icons-pack/react-simple-icons";
import { useExtracted } from "next-intl";
import Image from "next/image";
import Link from "next/link";

const footerLinkClassName =
  "inline-flex min-h-11 items-center text-sm leading-5 text-neutral-600 transition-colors hover:text-neutral-950 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:text-white md:min-h-8";

const socialLinks = [
  { label: "GitHub", href: "https://github.com/rybbit-io/rybbit", icon: SiGithub },
  { label: "Discord", href: "https://discord.gg/DEhGb4hYBj", icon: SiDiscord },
  { label: "X", href: "https://x.com/yang_frog", icon: SiX },
];

interface FooterLink {
  href: string;
  label: string;
  external?: boolean;
}

/**
 * Site footer. Default register is the marketing pages' instrument sheet
 * (1200px column with hairline sides, corner crosses and seams between
 * cells); under `data-chrome="bare"` (homepage redesign, see global.css) it
 * is a 1280px column with open columns and one hairline above the bottom row.
 */
export function Footer() {
  const t = useExtracted();

  const footerGroups: Array<{ title: string; links: FooterLink[] }> = [
    {
      title: t("Comparisons"),
      links: [
        { href: "/compare/google-analytics", label: t("vs Google Analytics") },
        { href: "/compare/cloudflare-analytics", label: t("vs Cloudflare Analytics") },
        { href: "/compare/plausible", label: t("vs Plausible") },
        { href: "/compare/umami", label: t("vs Umami") },
        { href: "/compare/fathom", label: t("vs Fathom") },
        { href: "/compare/simpleanalytics", label: t("vs Simple Analytics") },
        { href: "/compare/matomo", label: t("vs Matomo") },
        { href: "/compare/posthog", label: t("vs PostHog") },
      ],
    },
    {
      title: t("Features"),
      links: [
        { href: "/features/web-analytics", label: t("Web Analytics") },
        { href: "/features/session-replay", label: t("Session Replay") },
        { href: "/features/funnels", label: t("Funnels") },
        { href: "/features/user-journeys", label: t("User Journeys") },
        { href: "/features/goals", label: t("Goals") },
        { href: "/features/custom-events", label: t("Custom Events") },
        { href: "/features/sessions", label: t("Sessions") },
        { href: "/features/retention", label: t("Retention") },
        { href: "/features/web-vitals", label: t("Web Vitals") },
        { href: "/features/error-tracking", label: t("Error Tracking") },
        { href: "/features/user-profiles", label: t("User Profiles") },
      ],
    },
    {
      title: t("Resources"),
      links: [
        { href: "/docs", label: t("Documentation") },
        { href: "/features", label: t("Features") },
        { href: "/pricing", label: t("Pricing") },
        { href: "/blog", label: t("Blog") },
        { href: "/tools", label: t("Tools") },
        { href: "https://github.com/rybbit-io/rybbit", label: "GitHub", external: true },
        { href: "/docs/api/getting-started", label: t("API Reference") },
        { href: "/oss-friends", label: t("OSS Friends") },
        { href: "/affiliate", label: t("50% Affiliate Program") },
      ],
    },
    {
      title: t("Company"),
      links: [
        { href: "/company", label: t("Company information") },
        { href: "/contact", label: t("Contact") },
        { href: "/privacy", label: t("Privacy Policy") },
        { href: "/terms-and-conditions", label: t("Terms and Conditions") },
        { href: "/security", label: t("Security") },
        { href: "/dpa", label: t("DPA") },
        { href: "/brand", label: t("Brand Kit") },
        { href: "mailto:hello@rybbit.com", label: t("Support"), external: true },
      ],
    },
  ];

  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800">
      <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 bare:max-w-[1280px] bare:border-x-0 bare:px-5 dark:border-neutral-800 bare:sm:px-8">
        <GridCrosses className="hidden sm:block" />
        <div className="grid border-b border-neutral-200 bare:gap-10 bare:border-b-0 bare:py-12 dark:border-neutral-800 lg:grid-cols-12 bare:lg:gap-8 bare:lg:py-14">
          <div className="border-b border-neutral-200 px-5 py-10 bare:border-b-0 bare:px-0 bare:py-0 dark:border-neutral-800 sm:px-8 bare:sm:px-0 lg:col-span-3 lg:border-b-0 lg:border-r lg:py-14 bare:lg:border-r-0 bare:lg:py-0">
            <div className="flex h-full flex-col">
              <div>
                <Link
                  href="/"
                  aria-label="Rybbit home"
                  className="inline-flex rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
                >
                  <Image
                    src="/rybbit/horizontal_white.svg"
                    alt="Rybbit"
                    width={120}
                    height={0}
                    style={{ height: "auto" }}
                    className="invert dark:invert-0"
                  />
                </Link>

                <p className="mt-4 hidden max-w-[26ch] text-sm leading-relaxed text-neutral-500 bare:block dark:text-neutral-400">
                  {t("Open-source, cookieless web & product analytics.")}
                </p>

                <a
                  href="https://www.producthunt.com/products/rybbit?embed=true&utm_source=badge-top-post-badge&utm_medium=badge&utm_source=badge-rybbit&#0045;2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 inline-flex max-w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 bare:mt-6"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://api.producthunt.com/widgets/embed-image/v1/top-post-badge.svg?post_id=1028220&theme=neutral&period=daily&t=1761001525479"
                    alt="Rybbit: Product Hunt number one product of the day"
                    width="250"
                    height="54"
                    className="h-auto max-w-full"
                  />
                </a>
              </div>

              <div className="mt-8 flex items-center bare:-ml-2.5 bare:mt-6 lg:mt-auto lg:pt-12 bare:lg:mt-6 bare:lg:pt-0">
                {socialLinks.map(({ label, href, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex size-11 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white"
                    aria-label={label}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 bare:gap-x-6 bare:gap-y-10 lg:col-span-9 md:grid-cols-4">
            {footerGroups.map(group => (
              <section
                key={group.title}
                className="border-b border-neutral-200 px-5 py-10 last:border-b-0 bare:border-b-0 bare:px-0 bare:py-0 dark:border-neutral-800 sm:px-8 bare:sm:px-0 [&:nth-last-child(2)]:border-b-0 md:border-b-0 md:px-6 md:py-14 bare:md:px-0 bare:md:py-0"
              >
                <h2 className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">{group.title}</h2>
                <ul className="mt-4 bare:mt-3">
                  {group.links.map(link => (
                    <li key={link.href}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target={link.href.startsWith("http") ? "_blank" : undefined}
                          rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                          className={footerLinkClassName}
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link href={link.href} className={footerLinkClassName}>
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </nav>
        </div>

        <div className="grid bare:border-t bare:border-neutral-200 lg:grid-cols-12 dark:bare:border-neutral-800">
          <div className="flex items-center border-b border-neutral-200 px-5 py-5 text-sm text-neutral-500 bare:border-b-0 bare:px-0 bare:pb-0 bare:pt-5 dark:border-neutral-800 dark:text-neutral-400 sm:px-8 bare:sm:px-0 lg:col-span-3 lg:border-b-0 lg:border-r bare:lg:border-r-0 bare:lg:py-5">
            {t("© {year} Rybbit. All rights reserved.", { year: String(new Date().getFullYear()) })}
          </div>
          <div className="flex flex-col gap-4 px-5 py-4 bare:px-0 bare:pb-5 bare:pt-2 sm:flex-row sm:items-center sm:justify-between sm:px-8 bare:sm:px-0 lg:col-span-9 lg:px-6 bare:lg:px-0 bare:lg:py-4">
            <div className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
              <span>{t("Made with ❤️ by frogs")}</span>
              <a
                href="https://tomato.gg"
                target="_blank"
                rel="noopener noreferrer"
                title="Tomato.gg"
                className="group/frogs inline-flex min-h-11 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 sm:min-h-8"
              >
                <span className="inline-block group-hover/frogs:[animation:frog-hop_0.45s_cubic-bezier(0.22,1,0.36,1)] motion-reduce:group-hover/frogs:animate-none">
                  🐸
                </span>
                🍅
              </a>
            </div>
            <div className="flex items-center gap-2">
              <ThemeSwitcher />
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
