"use client";

import { Search } from "lucide-react";
import { useExtracted } from "next-intl";
import { cn } from "@/lib/utils";
import { useApplePlatform } from "./keys";
import { KeyCaps } from "./KeyCaps";
import { openCommandPalette } from "./store";
import { useCommandPaletteAvailable } from "./useCommandPaletteAvailable";

/** A visible way into the palette, with its shortcut, for people who don't know ⌘K yet. */
export function CommandPaletteTrigger({ className }: { className?: string }) {
  const t = useExtracted();
  const available = useCommandPaletteAvailable();
  const apple = useApplePlatform();

  if (!available) return null;

  return (
    <button
      type="button"
      onClick={openCommandPalette}
      aria-keyshortcuts={apple === false ? "Control+K" : "Meta+K"}
      className={cn(
        "flex h-8 w-full items-center gap-2 rounded-lg border border-neutral-200 px-2.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-150 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-white dark:focus-visible:ring-neutral-300",
        className
      )}
    >
      <Search aria-hidden className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-left">{t("Search")}</span>
      {apple !== null && <KeyCaps aria-hidden keys={[apple ? "⌘" : t("Ctrl"), "K"]} />}
    </button>
  );
}
