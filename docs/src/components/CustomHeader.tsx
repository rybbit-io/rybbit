"use client";

import { trackAdEvent } from "@/lib/trackAdEvent";
import { Menu, X } from "lucide-react";
import { useExtracted } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AppLink } from "./AppLink";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { landingContainer } from "./landing/section";
import { BlackFridayBanner } from "./BlackFridayBanner";
import { WelcomeBanner } from "./WelcomeBanner";

export function CustomHeader() {
  const t = useExtracted();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/pricing", label: t("Pricing") },
    { href: "/features", label: t("Features") },
    { href: "/docs", label: t("Docs") },
    { href: "/blog", label: t("Blog") },
    { href: "/sponsors", label: t("Sponsors") },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/80 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/70">
      {/* <BlackFridayBanner /> */}
      {/* <WelcomeBanner /> */}
      <nav className={`${landingContainer} relative flex h-14 items-center justify-between`} aria-label="Global">
        {/* Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
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
        <div className="hidden md:absolute md:left-1/2 md:block md:-translate-x-1/2">
          <div className="flex items-center gap-7">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right side - Login / Sign up */}
        <div className="hidden md:flex md:items-center md:gap-2">
          <AppLink href="https://app.rybbit.io" target="_blank">
            <button
              onClick={() => trackAdEvent("login", { location: "header" })}
              className="inline-flex h-9 cursor-pointer items-center rounded-md px-3 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50 dark:text-neutral-400 dark:hover:text-white"
            >
              {t("Login")}
            </button>
          </AppLink>
          <AppLink href="https://app.rybbit.io/signup" target="_blank">
            <button
              onClick={() => trackAdEvent("signup", { location: "header" })}
              className="inline-flex h-9 cursor-pointer items-center rounded-md bg-emerald-600 px-3.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
            >
              {t("Sign up")}
            </button>
          </AppLink>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md p-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="sr-only">{t("Open main menu")}</span>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-neutral-200 md:hidden dark:border-neutral-800">
          <div className={`${landingContainer} flex flex-col py-2`}>
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-2 py-2.5 text-base font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://github.com/rybbit-io/rybbit"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md px-2 py-2.5 text-base font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              GitHub
            </a>

            <div className="mt-1 flex items-center justify-between border-t border-neutral-200 px-2 py-3 dark:border-neutral-800">
              <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{t("Theme")}</span>
              <ThemeSwitcher />
            </div>

            <div className="flex gap-3 border-t border-neutral-200 px-2 pt-3 pb-2 dark:border-neutral-800">
              <AppLink href="https://app.rybbit.io" target="_blank" rel="noopener noreferrer" className="flex-1">
                <button
                  onClick={() => trackAdEvent("login", { location: "header" })}
                  data-rybbit-event="login"
                  className="h-10 w-full cursor-pointer rounded-md border border-neutral-300 text-sm font-medium text-neutral-900 dark:border-neutral-700 dark:text-white"
                >
                  {t("Login")}
                </button>
              </AppLink>
              <AppLink href="https://app.rybbit.io/signup" target="_blank" rel="noopener noreferrer" className="flex-1">
                <button
                  onClick={() => trackAdEvent("signup", { location: "header" })}
                  className="h-10 w-full cursor-pointer rounded-md bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  {t("Sign up")}
                </button>
              </AppLink>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
