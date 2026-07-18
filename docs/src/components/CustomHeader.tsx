"use client";

import { AppLink } from "@/components/AppLink";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { trackAdEvent } from "@/lib/trackAdEvent";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useExtracted } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export function CustomHeader() {
  const t = useExtracted();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileMenuOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

  const navigation = [
    { href: "/#product", label: t("Product") },
    { href: "/features", label: t("Features") },
    { href: "/pricing", label: t("Pricing") },
    { href: "/docs", label: t("Docs") },
    { href: "/sponsors", label: t("Sponsors") },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <nav className="mx-auto flex h-16 max-w-[1280px] items-center px-5 sm:px-8 lg:px-10" aria-label={t("Global navigation")}>
        <Link
          href="/"
          className="flex shrink-0 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-4 dark:ring-offset-neutral-950"
          aria-label={t("Rybbit home")}
          onClick={() => setMobileMenuOpen(false)}
        >
          <Image
            src="/rybbit/horizontal_white.svg"
            alt="Rybbit"
            width={112}
            height={28}
            priority
            className="h-auto w-28 invert dark:invert-0"
          />
        </Link>

        <div className="hidden flex-1 items-center justify-center md:flex">
          <div className="flex items-center gap-7">
            {navigation.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-sm text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-4 dark:text-neutral-400 dark:hover:text-white dark:ring-offset-neutral-950"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <AppLink
            href="https://app.rybbit.io"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackAdEvent("login", { location: "header" })}
            className="inline-flex min-h-9 items-center justify-center rounded-md px-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-white"
          >
            {t("Log in")}
          </AppLink>
          <AppLink
            href="https://app.rybbit.io/signup"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackAdEvent("signup", { location: "header" })}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:ring-offset-neutral-950"
          >
            {t("Start free")}
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </AppLink>
        </div>

        <div className="ml-auto flex items-center gap-2 md:hidden">
          <AppLink
            href="https://app.rybbit.io/signup"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackAdEvent("signup", { location: "header_mobile" })}
            className="inline-flex min-h-9 items-center justify-center rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {t("Start free")}
          </AppLink>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-md text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-white"
            onClick={() => setMobileMenuOpen(open => !open)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            <span className="sr-only">{mobileMenuOpen ? t("Close main menu") : t("Open main menu")}</span>
            {mobileMenuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div id="mobile-navigation" className="absolute inset-x-0 top-full border-b border-neutral-200 bg-white md:hidden dark:border-neutral-800 dark:bg-neutral-950">
          <div className="mx-auto max-w-[1280px] px-5 pb-5 pt-3 sm:px-8">
            <div className="divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              {navigation.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-h-12 items-center justify-between text-base font-medium text-neutral-800 transition-colors hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:text-neutral-200 dark:hover:text-emerald-400"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                  <ArrowUpRight className="size-4 text-neutral-400" aria-hidden="true" />
                </Link>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <AppLink
                  href="https://app.rybbit.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    trackAdEvent("login", { location: "header_mobile" });
                    setMobileMenuOpen(false);
                  }}
                  className="text-sm font-semibold text-neutral-800 dark:text-neutral-200"
                >
                  {t("Log in")}
                </AppLink>
                <a
                  href="https://github.com/rybbit-io/rybbit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-neutral-800 dark:text-neutral-200"
                >
                  GitHub
                </a>
              </div>
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
