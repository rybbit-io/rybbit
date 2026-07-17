"use client";

import { trackAdEvent } from "@/lib/trackAdEvent";
import { Menu, X } from "lucide-react";
import { useExtracted } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AppLink } from "./AppLink";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { BlackFridayBanner } from "./BlackFridayBanner";
import { WelcomeBanner } from "./WelcomeBanner";

const navLinkClass =
  "text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors";

export function CustomHeader() {
  const t = useExtracted();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 dark:border-neutral-800 bg-background/80 backdrop-blur-md">
      {/* <BlackFridayBanner /> */}
      {/* <WelcomeBanner /> */}
      <nav
        className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6 md:border-x border-neutral-200 dark:border-neutral-800"
        aria-label="Global"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0">
          <Image
            src="/rybbit/horizontal_white.svg"
            alt="Rybbit"
            width={110}
            height={0}
            style={{ height: "auto" }}
            className="dark:invert-0 invert"
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:flex-1 md:items-center md:gap-x-7 md:ml-10">
          <Link href="/pricing" className={navLinkClass}>
            {t("Pricing")}
          </Link>
          <Link href="/features" className={navLinkClass}>
            {t("Features")}
          </Link>
          <Link href="/docs" className={navLinkClass}>
            {t("Docs")}
          </Link>
          <Link href="/sponsors" className={navLinkClass}>
            {t("Sponsors")}
          </Link>
        </div>

        {/* Right side - Login / Sign up */}
        <div className="hidden md:flex md:items-center md:gap-x-2">
          <AppLink href="https://app.rybbit.io" target="_blank">
            <button
              onClick={() => trackAdEvent("login", { location: "header" })}
              className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50 cursor-pointer"
            >
              {t("Login")}
            </button>
          </AppLink>
          <AppLink href="https://app.rybbit.io/signup" target="_blank">
            <button
              onClick={() => trackAdEvent("signup", { location: "header" })}
              className="inline-flex h-9 items-center rounded-lg bg-emerald-600 px-3.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 cursor-pointer"
            >
              {t("Sign up")}
            </button>
          </AppLink>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg p-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
          >
            <span className="sr-only">{t("Open main menu")}</span>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-background/95 backdrop-blur-md">
          <div className="space-y-1 px-6 pb-4 pt-3">
            <Link
              href="/pricing"
              className="block rounded-lg px-3 py-2 text-base font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t("Pricing")}
            </Link>
            <Link
              href="/docs"
              className="block rounded-lg px-3 py-2 text-base font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t("Docs")}
            </Link>
            <Link
              href="/blog"
              className="block rounded-lg px-3 py-2 text-base font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t("Blog")}
            </Link>
            <a
              href="https://github.com/rybbit-io/rybbit"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg px-3 py-2 text-base font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              GitHub
            </a>

            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-base font-medium text-neutral-600 dark:text-neutral-300">{t("Theme")}</span>
                <ThemeSwitcher />
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <AppLink href="https://app.rybbit.io" target="_blank" rel="noopener noreferrer" className="block w-full">
                <button
                  onClick={() => trackAdEvent("login", { location: "header" })}
                  data-rybbit-event="login"
                  className="w-full inline-flex h-10 items-center justify-center rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm font-medium text-neutral-900 dark:text-white transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  {t("Login")}
                </button>
              </AppLink>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
