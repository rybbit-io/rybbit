"use client";

import { trackAdEvent } from "@/lib/trackAdEvent";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { BlackFridayBanner } from "./BlackFridayBanner";

export function CustomHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-300 dark:border-neutral-800 bg-background/80 backdrop-blur-md">
      {/* <BlackFridayBanner /> */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3" aria-label="Global">
        {/* Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <Image
              src="/rybbit-text.svg"
              alt="Rybbit"
              width={100}
              height={0}
              style={{ height: "auto" }}
              className="dark:invert-0 invert"
            />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:flex-1 md:justify-center">
          <div className="flex items-center gap-x-6">
            <Link
              href="/pricing"
              className="text-sm font-base text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/features"
              className="text-sm font-base text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Features
            </Link>
            <Link
              href="/docs"
              className="text-sm font-base text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Docs
            </Link>
            <Link
              href="/blog"
              className="text-sm font-base text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Blog
            </Link>
            <Link
              href="/sponsors"
              className="text-sm font-base text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Sponsors
            </Link>
          </div>
        </div>

        {/* Right side - Icons and Login */}
        <div className="hidden md:flex md:items-center md:gap-x-4">
          {/* Discord Icon */}
          <a
            href="https://discord.gg/DEhGb4hYBj"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-600 dark:text-neutral-200 hover:text-neutral-900 dark:hover:text-white transition-colors"
            aria-label="Discord"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </a>

          {/* GitHub Icon */}
          <a
            href="https://github.com/rybbit-io/rybbit"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-600 dark:text-neutral-200 hover:text-neutral-900 dark:hover:text-white transition-colors"
            aria-label="GitHub"
            onClick={() => trackAdEvent("github", { location: "header" })}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>

          {/* Theme Switcher */}
          <ThemeSwitcher />

          {/* Login Button */}
          <a href="https://app.rybbit.io" target="_blank" rel="noopener noreferrer">
            <button
              onClick={() => trackAdEvent("login", { location: "header" })}
              className="bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white text-sm font-medium px-3 py-1.5 rounded-md transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-opacity-50"
            >
              Login
            </button>
          </a>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md p-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="sr-only">Open main menu</span>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="space-y-1 px-4 pb-3 pt-2">
            <Link
              href="/pricing"
              className="block rounded-md px-3 py-2 text-base font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link
              href="/docs"
              className="block rounded-md px-3 py-2 text-base font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Docs
            </Link>
            <Link
              href="/blog"
              className="block rounded-md px-3 py-2 text-base font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Blog
            </Link>
            <a
              href="https://github.com/rybbit-io/rybbit"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-md px-3 py-2 text-base font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              GitHub
            </a>

            <div className="pt-2 border-t border-neutral-300 dark:border-neutral-800">
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-base font-medium text-neutral-600 dark:text-neutral-300">Theme</span>
                <ThemeSwitcher />
              </div>
            </div>

            <div className="border-t border-neutral-300 dark:border-neutral-800">
              <a href="https://app.rybbit.io" target="_blank" rel="noopener noreferrer" className="block w-full">
                <button
                  onClick={() => trackAdEvent("login", { location: "header" })}
                  data-rybbit-event="login"
                  className="w-full bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white text-sm font-medium px-3 py-2 rounded-md border border-neutral-400 dark:border-neutral-600"
                >
                  Login
                </button>
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
