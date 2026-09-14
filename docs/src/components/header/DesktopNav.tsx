"use client";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { ArrowRight, ArrowUpRight, Star } from "lucide-react";
import Link from "next/link";
import { useHeaderNav, type HeaderNavGroup, type HeaderNavLink } from "./HeaderNavData";

/** Crosshair tick, same mark as GridCrosses on the landing sections. */
function SeamCross({ className }: { className?: string }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 11 11"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-600 ${className ?? ""}`}
    >
      <path d="M5.5 0V11M0 5.5H11" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

const seamGrid = "grid gap-px bg-neutral-200 dark:bg-neutral-800";
const seamCell = "bg-white dark:bg-neutral-950";

function FeatureCell({ link }: { link: HeaderNavLink }) {
  const Icon = link.icon;
  return (
    <NavigationMenuLink asChild>
      <Link
        href={link.href}
        className={`${seamCell} group flex h-full flex-col p-3.5 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-500 dark:hover:bg-neutral-900`}
      >
        {Icon && (
          <Icon
            className="mb-2.5 size-4 text-neutral-500 transition-colors group-hover:text-emerald-600 dark:text-neutral-400 dark:group-hover:text-emerald-500"
            aria-hidden="true"
          />
        )}
        <span className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">{link.label}</span>
        {link.description && (
          <span className="mt-1 text-xs leading-snug text-neutral-600 dark:text-neutral-400">{link.description}</span>
        )}
      </Link>
    </NavigationMenuLink>
  );
}

function PlainLinkList({ group }: { group: HeaderNavGroup }) {
  return (
    <>
      <p className="px-2.5 pb-1.5 pt-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">{group.label}</p>
      <ul>
        {group.links.map((link) => (
          <li key={link.href}>
            <NavigationMenuLink asChild>
              <Link
                href={link.href}
                className="block rounded-sm px-2.5 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-500 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-white"
              >
                {link.label}
              </Link>
            </NavigationMenuLink>
          </li>
        ))}
      </ul>
    </>
  );
}

/** The single emerald action a panel is allowed: its aggregate link. */
function AggregateLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <NavigationMenuLink asChild>
      <Link
        href={href}
        className={`group/all flex items-center gap-1 text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:text-emerald-500 dark:hover:text-emerald-400 ${className ?? ""}`}
      >
        {label}
        <ArrowRight
          className="size-3.5 transition-transform group-hover/all:translate-x-0.5 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </Link>
    </NavigationMenuLink>
  );
}

export function DesktopNav() {
  const nav = useHeaderNav();

  return (
    <NavigationMenu className="hidden lg:flex">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>{nav.labels.features}</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="relative w-[700px]">
              {/* Legend strip: the one-script promise + the aggregate action */}
              <div className="flex h-10 items-center justify-between border-b border-neutral-200 px-3.5 dark:border-neutral-800">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{nav.labels.oneScript}</p>
                <AggregateLink href="/features" label={nav.labels.allFeatures} />
              </div>
              {/* Crosshairs where the column seams meet the legend seam */}
              <SeamCross className="left-1/3 top-10" />
              <SeamCross className="left-2/3 top-10" />
              <ul className={`${seamGrid} grid-cols-3`}>
                {nav.features.map((link) => (
                  <li key={link.href} className="h-full">
                    <FeatureCell link={link} />
                  </li>
                ))}
              </ul>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger>{nav.labels.solutions}</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className={`${seamGrid} w-[460px] grid-cols-2`}>
              <div className={`${seamCell} p-2`}>
                <PlainLinkList group={nav.useCases} />
              </div>
              <div className={`${seamCell} flex flex-col p-2`}>
                <PlainLinkList group={nav.compare} />
                <AggregateLink
                  href="/compare"
                  label={nav.labels.allComparisons}
                  className="mt-auto px-2.5 pb-1.5 pt-3"
                />
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger>{nav.labels.resources}</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className={`${seamGrid} w-[440px] grid-cols-2`}>
              {nav.resources.map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.href} className="h-full">
                    <NavigationMenuLink asChild>
                      <Link
                        href={link.href}
                        className={`${seamCell} group flex h-full items-center gap-2.5 p-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-500 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-white`}
                      >
                        {Icon && (
                          <Icon
                            className="size-4 shrink-0 text-neutral-500 transition-colors group-hover:text-emerald-600 dark:text-neutral-400 dark:group-hover:text-emerald-500"
                            aria-hidden="true"
                          />
                        )}
                        {link.label}
                      </Link>
                    </NavigationMenuLink>
                  </li>
                );
              })}
              <li className="h-full">
                <NavigationMenuLink asChild>
                  <a
                    href="https://github.com/rybbit-io/rybbit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${seamCell} group flex h-full items-center gap-2.5 p-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-500 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-white`}
                  >
                    <Star
                      className="size-4 shrink-0 text-neutral-500 transition-colors group-hover:text-emerald-600 dark:text-neutral-400 dark:group-hover:text-emerald-500"
                      aria-hidden="true"
                    />
                    GitHub
                    <ArrowUpRight className="ml-auto size-3.5 text-neutral-400 dark:text-neutral-500" aria-hidden="true" />
                  </a>
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <Link href="/pricing" className={navigationMenuTriggerStyle}>
              {nav.labels.pricing}
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <Link href="/docs" className={navigationMenuTriggerStyle}>
              {nav.labels.docs}
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
