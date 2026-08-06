"use client";

import { AppLink } from "@/components/AppLink";
import { DesktopNav } from "@/components/header/DesktopNav";
import { MobileNav } from "@/components/header/MobileNav";
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

        <DesktopNav />

        <div className="hidden items-center gap-2 lg:flex">
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
          className="inline-flex size-10 items-center justify-center rounded-md text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white lg:hidden"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
        >
          <span className="sr-only">{mobileMenuOpen ? t("Close main menu") : t("Open main menu")}</span>
          {mobileMenuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        </button>
      </nav>

      {mobileMenuOpen && <MobileNav onNavigate={() => setMobileMenuOpen(false)} />}
    </header>
  );
}
