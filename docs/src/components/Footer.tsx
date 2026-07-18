import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { MessageCircle } from "lucide-react";
import { useExtracted } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { ThemeSwitcher } from "./ThemeSwitcher";

export function Footer() {
  const t = useExtracted();

  const groups = [
    {
      title: t("Product"),
      links: [
        { label: t("Features"), href: "/features" },
        { label: t("Pricing"), href: "/pricing" },
        { label: t("Live demo"), href: "https://demo.rybbit.com/81", external: true },
        { label: t("Security"), href: "/security" },
        { label: t("Sponsors"), href: "/sponsors" },
      ],
    },
    {
      title: t("Resources"),
      links: [
        { label: t("Documentation"), href: "/docs" },
        { label: t("Self-hosting"), href: "/docs/self-hosting" },
        { label: t("API reference"), href: "/docs/api/getting-started" },
        { label: t("Blog"), href: "/blog" },
        { label: t("Tools"), href: "/tools" },
      ],
    },
    {
      title: t("Compare"),
      links: [
        { label: t("Google Analytics"), href: "/compare/google-analytics" },
        { label: "PostHog", href: "/compare/posthog" },
        { label: "Plausible", href: "/compare/plausible" },
        { label: "Umami", href: "/compare/umami" },
        { label: "Matomo", href: "/compare/matomo" },
      ],
    },
    {
      title: t("Company"),
      links: [
        { label: t("Contact"), href: "/contact" },
        { label: t("Privacy"), href: "/privacy" },
        { label: t("Terms"), href: "/terms-and-conditions" },
        { label: t("DPA"), href: "/dpa" },
        { label: t("Brand kit"), href: "/brand" },
      ],
    },
  ];

  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto w-full max-w-[1280px] px-5 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 py-14 md:grid-cols-12 md:py-20">
          <div className="md:col-span-4">
            <Image
              src="/rybbit/horizontal_white.svg"
              alt="Rybbit"
              width={124}
              height={31}
              className="invert dark:invert-0"
            />
            <p className="mt-5 max-w-[30ch] text-sm leading-6 text-neutral-600 dark:text-neutral-400">
              {t("Open-source, cookieless web and product analytics that respects your visitors.")}
            </p>
            <div className="mt-6 flex items-center gap-2">
              <a
                href="https://github.com/rybbit-io/rybbit"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-neutral-300 text-neutral-600 transition-colors hover:border-neutral-500 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500 dark:hover:text-white"
              >
                <SiGithub className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="https://discord.gg/DEhGb4hYBj"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Discord"
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-neutral-300 text-neutral-600 transition-colors hover:border-neutral-500 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500 dark:hover:text-white"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="https://x.com/yang_frog"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X"
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-neutral-300 text-sm font-semibold text-neutral-600 transition-colors hover:border-neutral-500 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500 dark:hover:text-white"
              >
                𝕏
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 md:col-span-8">
            {groups.map(group => (
              <div key={group.title}>
                <h3 className="text-sm font-semibold text-neutral-950 dark:text-white">{group.title}</h3>
                <ul className="mt-2">
                  {group.links.map(link => (
                    <li key={link.href}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center text-sm text-neutral-600 transition-colors hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-neutral-400 dark:hover:text-white"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link href={link.href} className="inline-flex min-h-11 items-center text-sm text-neutral-600 transition-colors hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-neutral-400 dark:hover:text-white">
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-neutral-200 py-6 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
          <span>{t("© {year} Rybbit. All rights reserved.", { year: String(new Date().getFullYear()) })}</span>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}
