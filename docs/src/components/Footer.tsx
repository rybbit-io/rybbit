import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { MessageCircle } from "lucide-react";
import { useExtracted } from "next-intl";
import Image from "next/image";
import Link from "next/link";

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

function FooterLinkItem({ link }: { link: FooterLink }) {
  const className = "text-sm leading-6 text-neutral-600 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white";

  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
        {link.label}
      </a>
    );
  }

  return (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  );
}

export function Footer() {
  const t = useExtracted();

  const linkGroups: { title: string; links: FooterLink[] }[] = [
    {
      title: t("Product"),
      links: [
        { label: t("Web Analytics"), href: "/features/web-analytics" },
        { label: t("Session Replay"), href: "/features/session-replay" },
        { label: t("Funnels"), href: "/features/funnels" },
        { label: t("User Journeys"), href: "/features/user-journeys" },
        { label: t("Goals"), href: "/features/goals" },
        { label: t("Error Tracking"), href: "/features/error-tracking" },
        { label: t("Features"), href: "/features" },
        { label: t("Pricing"), href: "/pricing" },
      ],
    },
    {
      title: t("Compare"),
      links: [
        { label: t("Google Analytics"), href: "/compare/google-analytics" },
        { label: t("Plausible"), href: "/compare/plausible" },
        { label: t("Umami"), href: "/compare/umami" },
        { label: t("Fathom"), href: "/compare/fathom" },
        { label: t("PostHog"), href: "/compare/posthog" },
        { label: t("Matomo"), href: "/compare/matomo" },
        { label: t("Simple Analytics"), href: "/compare/simpleanalytics" },
        { label: t("Cloudflare Analytics"), href: "/compare/cloudflare-analytics" },
      ],
    },
    {
      title: t("Resources"),
      links: [
        { label: t("Documentation"), href: "/docs" },
        { label: t("API Reference"), href: "/docs/api/getting-started" },
        { label: t("Self-hosting"), href: "/docs/self-hosting" },
        { label: t("Blog"), href: "/blog" },
        { label: t("Tools"), href: "/tools" },
        { label: t("Community"), href: "https://discord.gg/DEhGb4hYBj", external: true },
        { label: "GitHub", href: "https://github.com/rybbit-io/rybbit", external: true },
        { label: t("OSS Friends"), href: "/oss-friends" },
      ],
    },
    {
      title: t("Company"),
      links: [
        { label: t("Contact"), href: "/contact" },
        { label: t("Sponsors"), href: "/sponsors" },
        { label: t("Security"), href: "/security" },
        { label: t("Brand Kit"), href: "/brand" },
        { label: t("Affiliate Program"), href: "/affiliate" },
        { label: t("Privacy Policy"), href: "/privacy" },
        { label: t("Terms and Conditions"), href: "/terms-and-conditions" },
        { label: t("DPA"), href: "/dpa" },
      ],
    },
  ];

  return (
    <footer className="border-t border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 py-14 md:py-16 lg:grid-cols-12 lg:gap-8 lg:py-20">
          <div className="border-b border-neutral-200 pb-12 lg:col-span-4 lg:border-b-0 lg:pb-0 dark:border-neutral-800">
            <Link href="/" className="inline-flex rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              <Image
                src="/rybbit/horizontal_white.svg"
                alt="Rybbit"
                width={124}
                height={32}
                className="h-auto w-[124px] invert dark:invert-0"
              />
            </Link>
            <p className="mt-6 max-w-[34ch] text-sm leading-6 text-neutral-600 dark:text-neutral-400">
              {t("Open-source, cookieless web and product analytics built for clear answers.")}
            </p>
            <div className="mt-7 flex items-center gap-2">
              <a
                href="https://github.com/rybbit-io/rybbit"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex size-9 items-center justify-center rounded-md border border-neutral-300 text-neutral-600 transition-colors hover:bg-white hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white"
                aria-label="GitHub"
              >
                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.79-.26.79-.58v-2.23c-3.34.73-4.03-1.42-4.03-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.21.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23A11.5 11.5 0 0 1 12 6.8c1.02 0 2.05.14 3 .4 2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.82 1.1.82 2.22v3.3c0 .32.19.69.8.57A12 12 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
                </svg>
              </a>
              <a
                href="https://discord.gg/DEhGb4hYBj"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex size-9 items-center justify-center rounded-md border border-neutral-300 text-neutral-600 transition-colors hover:bg-white hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white"
                aria-label="Discord"
              >
                <MessageCircle className="size-4" aria-hidden="true" />
              </a>
              <a
                href="https://x.com/yang_frog"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex size-9 items-center justify-center rounded-md border border-neutral-300 text-sm font-semibold text-neutral-600 transition-colors hover:bg-white hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white"
                aria-label="X"
              >
                X
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 pt-12 sm:grid-cols-4 lg:col-span-8 lg:pt-0">
            {linkGroups.map(group => (
              <div key={group.title}>
                <h2 className="text-sm font-semibold text-neutral-950 dark:text-white">{group.title}</h2>
                <ul className="mt-5 space-y-2.5">
                  {group.links.map(link => (
                    <li key={link.href}>
                      <FooterLinkItem link={link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-neutral-200 py-6 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:text-neutral-400">
          <p>{t("© {year} Rybbit. All rights reserved.", { year: String(new Date().getFullYear()) })}</p>
          <div className="flex flex-wrap items-center gap-4">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <span>{t("Made with care by frogs")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
