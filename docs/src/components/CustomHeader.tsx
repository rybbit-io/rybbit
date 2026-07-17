"use client";

import { AppLink } from "@/components/AppLink";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { trackAdEvent } from "@/lib/trackAdEvent";
import { Menu, X } from "lucide-react";
import { useExtracted } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const desktopLinkClass =
  "text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-500 dark:text-neutral-400 dark:hover:text-white";

export function CustomHeader() {
  const t = useExtracted();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/95 dark:border-neutral-800 dark:bg-neutral-950/95 supports-[backdrop-filter]:backdrop-blur-md">
      <nav
        className="mx-auto flex h-16 w-[calc(100%-1.5rem)] max-w-[1240px] items-center md:w-[calc(100%-2rem)]"
        aria-label="Global"
      >
        <Link
          href="/"
          className="flex shrink-0 items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-500"
          aria-label="Rybbit home"
        >
          <Image
            src="/rybbit/horizontal_white.svg"
            alt="Rybbit"
            width={112}
            height={31}
            className="h-auto dark:invert-0 invert"
            priority
          />
        </Link>

        <div className="ml-12 hidden items-center gap-7 md:flex">
          <Link href="/features" className={desktopLinkClass}>
            {t("Features")}
          </Link>
          <Link href="/pricing" className={desktopLinkClass}>
            {t("Pricing")}
          </Link>
          <Link href="/docs" className={desktopLinkClass}>
            {t("Docs")}
          </Link>
          <Link href="/sponsors" className={desktopLinkClass}>
            {t("Sponsors")}
          </Link>
        </div>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <ThemeSwitcher />
          <AppLink
            href="https://app.rybbit.io"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackAdEvent("login", { location: "header" })}
            data-rybbit-event="login"
            className="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-white"
          >
            {t("Login")}
          </AppLink>
          <AppLink
            href="https://app.rybbit.io/signup"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackAdEvent("signup", { location: "header" })}
            data-rybbit-event="signup"
            data-rybbit-prop-location="header"
            className="inline-flex h-9 items-center justify-center rounded-md border border-emerald-800 bg-emerald-700 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          >
            {t("Sign up")}
          </AppLink>
        </div>

        <button
          type="button"
          className="ml-auto inline-flex size-11 items-center justify-center rounded-md text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 md:hidden dark:text-neutral-300 dark:hover:bg-neutral-900"
          onClick={() => setMobileMenuOpen(open => !open)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
        >
          <span className="sr-only">{t("Open main menu")}</span>
          {mobileMenuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        </button>
      </nav>

      {mobileMenuOpen && (
        <div id="mobile-navigation" className="border-t border-neutral-200 bg-white md:hidden dark:border-neutral-800 dark:bg-neutral-950">
          <div className="mx-auto w-[calc(100%-1.5rem)] max-w-[1240px] py-4 md:w-[calc(100%-2rem)]">
            <div className="grid grid-cols-2 gap-1">
              {[
                [t("Features"), "/features"],
                [t("Pricing"), "/pricing"],
                [t("Docs"), "/docs"],
                [t("Sponsors"), "/sponsors"],
              ].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-md px-3 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-emerald-500 dark:text-neutral-300 dark:hover:bg-neutral-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {label}
                </Link>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
              <ThemeSwitcher />
              <AppLink
                href="https://app.rybbit.io"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  setMobileMenuOpen(false);
                  trackAdEvent("login", { location: "header" });
                }}
                className="ml-auto inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-800 dark:border-neutral-700 dark:text-neutral-200"
              >
                {t("Login")}
              </AppLink>
              <AppLink
                href="https://app.rybbit.io/signup"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  setMobileMenuOpen(false);
                  trackAdEvent("signup", { location: "header" });
                }}
                className="inline-flex h-11 items-center justify-center rounded-md border border-emerald-800 bg-emerald-700 px-4 text-sm font-semibold text-white"
              >
                {t("Sign up")}
              </AppLink>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
