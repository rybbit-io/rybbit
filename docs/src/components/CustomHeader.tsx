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

export function CustomHeader() {
  const t = useExtracted();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/pricing", label: t("Pricing") },
    { href: "/features", label: t("Features") },
    { href: "/docs", label: t("Docs") },
    { href: "/sponsors", label: t("Sponsors") },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md">
      {/* <BlackFridayBanner /> */}
      {/* <WelcomeBanner /> */}
      <nav className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 md:px-6" aria-label="Global">
        {/* Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <Image
              src="/rybbit/horizontal_white.svg"
              alt="Rybbit"
              width={120}
              height={0}
              style={{ height: "auto" }}
              className="dark:invert-0 invert"
            />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:flex-1 md:justify-center">
          <div className="flex items-center gap-x-8">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right side - Login / Sign up */}
        <div className="hidden md:flex md:items-center md:gap-x-2">
          <AppLink href="https://app.rybbit.io" target="_blank">
            <button
              onClick={() => trackAdEvent("login", { location: "header" })}
              className="text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white px-3 py-2 rounded-lg transition-colors cursor-pointer"
            >
              {t("Login")}
            </button>
          </AppLink>
          <AppLink href="https://app.rybbit.io/signup" target="_blank">
            <button
              onClick={() => trackAdEvent("signup", { location: "header" })}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
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
          >
            <span className="sr-only">{t("Open main menu")}</span>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md">
          <div className="space-y-1 px-4 pb-4 pt-3">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg px-3 py-2 text-base font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://github.com/rybbit-io/rybbit"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg px-3 py-2 text-base font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              GitHub
            </a>

            <div className="border-t border-neutral-200 dark:border-neutral-800">
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-base font-medium text-neutral-600 dark:text-neutral-300">{t("Theme")}</span>
                <ThemeSwitcher />
              </div>
            </div>

            <div className="flex gap-2 border-t border-neutral-200 dark:border-neutral-800 pt-3">
              <AppLink href="https://app.rybbit.io" target="_blank" rel="noopener noreferrer" className="block w-full">
                <button
                  onClick={() => trackAdEvent("login", { location: "header" })}
                  data-rybbit-event="login"
                  className="w-full border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-sm font-medium px-3 py-2 rounded-lg cursor-pointer"
                >
                  {t("Login")}
                </button>
              </AppLink>
              <AppLink href="https://app.rybbit.io/signup" target="_blank" rel="noopener noreferrer" className="block w-full">
                <button
                  onClick={() => trackAdEvent("signup", { location: "header" })}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-3 py-2 rounded-lg cursor-pointer"
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
