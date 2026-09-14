"use client";

import { AppLink } from "@/components/AppLink";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { trackAdEvent } from "@/lib/trackAdEvent";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { useHeaderNav, type HeaderNavLink } from "./HeaderNavData";

interface MobileNavProps {
  onNavigate: () => void;
}

function MobileLink({ link, onNavigate }: { link: HeaderNavLink; onNavigate: () => void }) {
  return (
    <Link
      href={link.href}
      className="block rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white"
      onClick={onNavigate}
    >
      {link.label}
    </Link>
  );
}

export function MobileNav({ onNavigate }: MobileNavProps) {
  const t = useExtracted();
  const nav = useHeaderNav();

  const sections = [
    {
      value: "features",
      label: nav.labels.features,
      links: [...nav.features, { href: "/features", label: nav.labels.allFeatures }],
    },
    {
      value: "solutions",
      label: nav.labels.solutions,
      links: [
        ...nav.useCases.links,
        ...nav.compare.links,
        { href: "/compare", label: nav.labels.allComparisons },
      ],
    },
    {
      value: "resources",
      label: nav.labels.resources,
      links: nav.resources,
    },
  ];

  return (
    <div
      id="mobile-navigation"
      className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 lg:hidden"
    >
      <div className="mx-auto max-w-[1200px] border-x border-neutral-200 px-5 py-2 dark:border-neutral-800 sm:px-8">
        <Accordion type="multiple">
          {sections.map((section) => (
            <AccordionItem key={section.value} value={section.value} className="border-neutral-200 dark:border-neutral-800">
              <AccordionTrigger className="px-3 py-3 text-base font-medium text-neutral-700 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-300 dark:hover:text-white">
                {section.label}
              </AccordionTrigger>
              <AccordionContent className="pb-2">
                {section.links.map((link) => (
                  <MobileLink key={link.href} link={link} onNavigate={onNavigate} />
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="grid gap-1 py-2">
          <Link
            href="/pricing"
            className="rounded-md px-3 py-3 text-base font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-white"
            onClick={onNavigate}
          >
            {nav.labels.pricing}
          </Link>
          <Link
            href="/docs"
            className="rounded-md px-3 py-3 text-base font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-white"
            onClick={onNavigate}
          >
            {nav.labels.docs}
          </Link>
        </div>

        <div className="flex items-center justify-between border-t border-neutral-200 py-4 dark:border-neutral-800">
          <ThemeSwitcher />
          <div className="flex items-center gap-2">
            <AppLink
              href="https://app.rybbit.io"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                trackAdEvent("login", { location: "header" });
                onNavigate();
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
                onNavigate();
              }}
              className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-medium text-white"
            >
              {t("Sign up")}
            </AppLink>
          </div>
        </div>
      </div>
    </div>
  );
}
