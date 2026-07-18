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
  "text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600";

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
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md">
      {/* <BlackFridayBanner /> */}
      {/* <WelcomeBanner /> */}
      <nav
        className="mx-auto grid h-14 max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-6"
        aria-label="Global"
      >
        {/* Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600">
            <Image
              src="/rybbit/horizontal_white.svg"
              alt="Rybbit"
              width={110}
              height={0}
              style={{ height: "auto" }}
              className="dark:invert-0 invert"
            />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-x-7 md:flex">
          {navItems.map(item => (
            <Link key={item.href} href={item.href} className={navLinkClass}>
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right side - actions */}
        <div className="hidden items-center justify-end gap-x-2 md:flex">
          <AppLink href="https://app.rybbit.io" target="_blank">
            <button
              onClick={() => trackAdEvent("login", { location: "header" })}
              className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-neutral-600 dark:text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600 cursor-pointer"
            >
              {t("Login")}
            </button>
          </AppLink>
          <AppLink href="https://app.rybbit.io/signup" target="_blank">
            <button
              onClick={() => trackAdEvent("signup", { location: "header" })}
              className="inline-flex h-9 items-center rounded-md bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 cursor-pointer"
            >
              {t("Sign up")}
            </button>
          </AppLink>
        </div>

        {/* Mobile menu button */}
        <div className="col-start-3 flex justify-end md:hidden">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600"
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
        <div className="border-t border-neutral-200 dark:border-neutral-800 md:hidden">
          <div className="mx-auto max-w-6xl px-6 py-4">
            <div className="flex flex-col">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="border-b border-neutral-200 dark:border-neutral-800 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <a
                href="https://github.com/rybbit-io/rybbit"
                target="_blank"
                rel="noopener noreferrer"
                className="border-b border-neutral-200 dark:border-neutral-800 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                GitHub
              </a>
            </div>

            <div className="flex items-center justify-between py-3">
              <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{t("Theme")}</span>
              <ThemeSwitcher />
            </div>

            <div className="flex flex-col gap-2 pb-2">
              <AppLink href="https://app.rybbit.io/signup" target="_blank" rel="noopener noreferrer" className="block w-full">
                <button
                  onClick={() => trackAdEvent("signup", { location: "header" })}
                  className="w-full h-10 rounded-md bg-emerald-600 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
                >
                  {t("Sign up")}
                </button>
              </AppLink>
              <AppLink href="https://app.rybbit.io" target="_blank" rel="noopener noreferrer" className="block w-full">
                <button
                  onClick={() => trackAdEvent("login", { location: "header" })}
                  className="w-full h-10 rounded-md border border-neutral-300 dark:border-neutral-700 text-sm font-medium text-neutral-900 dark:text-white transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
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
