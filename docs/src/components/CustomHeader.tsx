"use client";

import { AppLink } from "@/components/AppLink";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { trackAdEvent } from "@/lib/trackAdEvent";
import { Menu, X } from "lucide-react";
import { useExtracted } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export function CustomHeader() {
  const t = useExtracted();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/pricing", label: t("Pricing") },
    { href: "/features", label: t("Features") },
    { href: "/docs", label: t("Docs") },
    { href: "/sponsors", label: t("Sponsors") },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/95 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-950/95">
      <nav
        className="mx-auto flex h-14 max-w-[1200px] items-center justify-between border-x border-neutral-200 px-5 dark:border-neutral-800 sm:px-8 lg:px-10"
        aria-label="Global"
      >
        <Link
          href="/"
          className="flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
          aria-label="Rybbit home"
        >
          <Image
            src="/rybbit/horizontal_white.svg"
            alt="Rybbit"
            width={104}
            height={0}
            priority
            style={{ height: "auto" }}
            className="invert dark:invert-0"
          />
        </Link>

        <div className="hidden items-center md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2.5 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeSwitcher />
          <AppLink
            href="https://app.rybbit.io"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackAdEvent("login", { location: "header" })}
            className="inline-flex h-8 items-center justify-center rounded-md px-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-white"
          >
            {t("Login")}
          </AppLink>
          <AppLink
            href="https://app.rybbit.io/signup"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackAdEvent("signup", { location: "header" })}
            className="inline-flex h-8 items-center justify-center rounded-md bg-emerald-600 px-3 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
          >
            {t("Sign up")}
          </AppLink>
        </div>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-md text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white md:hidden"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
        >
          <span className="sr-only">{mobileMenuOpen ? t("Close main menu") : t("Open main menu")}</span>
          {mobileMenuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        </button>
      </nav>

      {mobileMenuOpen && (
        <div id="mobile-navigation" className="border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 md:hidden">
          <div className="mx-auto max-w-[1200px] border-x border-neutral-200 px-5 py-4 dark:border-neutral-800 sm:px-8">
            <div className="grid gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-3 text-base font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-4 dark:border-neutral-800">
              <ThemeSwitcher />
              <div className="flex items-center gap-2">
                <AppLink
                  href="https://app.rybbit.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    trackAdEvent("login", { location: "header" });
                    setMobileMenuOpen(false);
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-900 dark:border-neutral-700 dark:text-white"
                >
                  {t("Login")}
                </AppLink>
                <AppLink
                  href="https://app.rybbit.io/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    trackAdEvent("signup", { location: "header" });
                    setMobileMenuOpen(false);
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-medium text-white"
                >
                  {t("Sign up")}
                </AppLink>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
