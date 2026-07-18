"use client";

import { BUTTON_PRIMARY, BUTTON_SECONDARY, BUTTON_SM, CONTAINER, HAIRLINE } from "@/components/landing/primitives";
import { trackAdEvent } from "@/lib/trackAdEvent";
import { useGithubStarCount } from "@/lib/useGithubStarCount";
import { cn } from "@/lib/utils";
import { Menu, Star, X } from "lucide-react";
import { useExtracted } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AppLink } from "./AppLink";
import { ThemeSwitcher } from "./ThemeSwitcher";

const NAV_LINK_CLASS =
  "text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors";

const MOBILE_LINK_CLASS =
  "block rounded-md px-3 py-2 text-base font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white";

function GitHubStars() {
  const { starCount, isLoading } = useGithubStarCount();

  return (
    <a
      href="https://github.com/rybbit-io/rybbit"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="GitHub"
      onClick={() => trackAdEvent("github", { location: "header" })}
      className={cn(
        "hidden lg:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors",
        HAIRLINE
      )}
    >
      <svg className="size-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
      {!isLoading && starCount && (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Star className="size-3.5 fill-current text-neutral-400 dark:text-neutral-500" aria-hidden />
          {starCount}
        </span>
      )}
    </a>
  );
}

export function CustomHeader() {
  const t = useExtracted();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-white/85 dark:bg-neutral-950/80 backdrop-blur-md",
        HAIRLINE
      )}
    >
      <nav className={cn(CONTAINER, "flex h-14 items-center justify-between gap-6")} aria-label="Global">
        <div className="flex items-center gap-8">
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

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/pricing" className={NAV_LINK_CLASS}>
              {t("Pricing")}
            </Link>
            <Link href="/features" className={NAV_LINK_CLASS}>
              {t("Features")}
            </Link>
            <Link href="/docs" className={NAV_LINK_CLASS}>
              {t("Docs")}
            </Link>
            <Link href="/sponsors" className={NAV_LINK_CLASS}>
              {t("Sponsors")}
            </Link>
          </div>
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-2.5">
          <GitHubStars />
          <AppLink href="https://app.rybbit.io" target="_blank">
            <button
              onClick={() => trackAdEvent("login", { location: "header" })}
              className={cn(BUTTON_SECONDARY, BUTTON_SM)}
            >
              {t("Login")}
            </button>
          </AppLink>
          <AppLink href="https://app.rybbit.io/signup" target="_blank">
            <button
              onClick={() => trackAdEvent("signup", { location: "header" })}
              className={cn(BUTTON_PRIMARY, BUTTON_SM)}
            >
              {t("Sign up")}
            </button>
          </AppLink>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md p-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="sr-only">{t("Open main menu")}</span>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className={cn("md:hidden border-t bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md", HAIRLINE)}>
          <div className="space-y-1 px-4 pb-4 pt-2">
            <Link href="/pricing" className={MOBILE_LINK_CLASS} onClick={() => setMobileMenuOpen(false)}>
              {t("Pricing")}
            </Link>
            <Link href="/features" className={MOBILE_LINK_CLASS} onClick={() => setMobileMenuOpen(false)}>
              {t("Features")}
            </Link>
            <Link href="/docs" className={MOBILE_LINK_CLASS} onClick={() => setMobileMenuOpen(false)}>
              {t("Docs")}
            </Link>
            <a
              href="https://github.com/rybbit-io/rybbit"
              target="_blank"
              rel="noopener noreferrer"
              className={MOBILE_LINK_CLASS}
              onClick={() => setMobileMenuOpen(false)}
            >
              GitHub
            </a>

            <div className={cn("pt-2 border-t", HAIRLINE)}>
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-base font-medium text-neutral-600 dark:text-neutral-300">{t("Theme")}</span>
                <ThemeSwitcher />
              </div>
            </div>

            <div className={cn("border-t pt-3 flex flex-col gap-2", HAIRLINE)}>
              <AppLink href="https://app.rybbit.io" target="_blank" rel="noopener noreferrer" className="block w-full">
                <button
                  onClick={() => trackAdEvent("login", { location: "header" })}
                  data-rybbit-event="login"
                  className={cn(BUTTON_SECONDARY, "h-10 w-full text-sm")}
                >
                  {t("Login")}
                </button>
              </AppLink>
              <AppLink
                href="https://app.rybbit.io/signup"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full"
              >
                <button
                  onClick={() => trackAdEvent("signup", { location: "header" })}
                  data-rybbit-event="signup"
                  className={cn(BUTTON_PRIMARY, "h-10 w-full text-sm")}
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
