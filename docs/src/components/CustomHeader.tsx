"use client";

import { AppLink } from "@/components/AppLink";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { trackAdEvent } from "@/lib/trackAdEvent";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useExtracted } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export function CustomHeader() {
  const t = useExtracted();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200/90 bg-white/90 backdrop-blur-xl dark:border-neutral-800/90 dark:bg-neutral-950/90">
      <nav
        className="mx-auto flex h-16 w-full max-w-[1280px] items-center px-5 sm:px-6 lg:grid lg:grid-cols-12 lg:px-8"
        aria-label={t("Global navigation")}
      >
        <div className="flex items-center lg:col-span-3">
          <Link href="/" className="inline-flex h-11 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" aria-label={t("Rybbit home")}>
            <Image
              src="/rybbit/horizontal_white.svg"
              alt="Rybbit"
              width={116}
              height={29}
              priority
              className="invert dark:invert-0"
            />
          </Link>
        </div>

        <div className="hidden items-center justify-center gap-7 lg:col-span-6 lg:flex">
          <Link href="/features" className="inline-flex h-11 items-center text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-neutral-300 dark:hover:text-white">
            {t("Features")}
          </Link>
          <Link href="/pricing" className="inline-flex h-11 items-center text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-neutral-300 dark:hover:text-white">
            {t("Pricing")}
          </Link>
          <Link href="/docs" className="inline-flex h-11 items-center text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-neutral-300 dark:hover:text-white">
            {t("Docs")}
          </Link>
          <Link href="/blog" className="inline-flex h-11 items-center text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-neutral-300 dark:hover:text-white">
            {t("Blog")}
          </Link>
          <a
            href="https://github.com/rybbit-io/rybbit"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-1.5 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-neutral-300 dark:hover:text-white"
          >
            <SiGithub className="h-4 w-4" aria-hidden="true" />
            GitHub
          </a>
        </div>

        <div className="ml-auto hidden items-center justify-end gap-2 lg:col-span-3 lg:flex">
          <AppLink
            href="https://app.rybbit.io"
            target="_blank"
            onClick={() => trackAdEvent("login", { location: "header" })}
            className="inline-flex h-11 items-center justify-center rounded-md px-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-white"
          >
            {t("Log in")}
          </AppLink>
          <AppLink
            href="https://app.rybbit.io/signup"
            target="_blank"
            onClick={() => trackAdEvent("signup", { location: "header" })}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {t("Get started")}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </AppLink>
        </div>

        <button
          type="button"
          className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-md text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-300 dark:hover:bg-neutral-900 lg:hidden"
          onClick={() => setMobileMenuOpen(open => !open)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
        >
          <span className="sr-only">{mobileMenuOpen ? t("Close main menu") : t("Open main menu")}</span>
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {mobileMenuOpen && (
        <div id="mobile-navigation" className="border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 lg:hidden">
          <div className="mx-auto w-full max-w-[1280px] px-5 py-5 sm:px-6">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {[
                { href: "/features", label: t("Features") },
                { href: "/pricing", label: t("Pricing") },
                { href: "/docs", label: t("Docs") },
                { href: "/blog", label: t("Blog") },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className="rounded-md px-3 py-3 text-base font-medium text-neutral-800 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900"
                >
                  {item.label}
                </Link>
              ))}
              <a
                href="https://github.com/rybbit-io/rybbit"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                className="inline-flex items-center gap-2 rounded-md px-3 py-3 text-base font-medium text-neutral-800 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900"
              >
                <SiGithub className="h-4 w-4" aria-hidden="true" />
                GitHub
              </a>
              <div className="flex items-center px-3 py-2">
                <ThemeSwitcher />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-neutral-200 pt-5 dark:border-neutral-800">
              <AppLink
                href="https://app.rybbit.io"
                target="_blank"
                onClick={() => {
                  trackAdEvent("login", { location: "header" });
                  closeMenu();
                }}
                className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 text-sm font-semibold text-neutral-900 dark:border-neutral-700 dark:text-white"
              >
                {t("Log in")}
              </AppLink>
              <AppLink
                href="https://app.rybbit.io/signup"
                target="_blank"
                onClick={() => {
                  trackAdEvent("signup", { location: "header" });
                  closeMenu();
                }}
                className="inline-flex h-11 items-center justify-center rounded-md bg-emerald-600 text-sm font-semibold text-white"
              >
                {t("Get started")}
              </AppLink>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
