"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeSwitcher() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="flex items-center gap-0.5 rounded-full border border-neutral-200 bg-neutral-100 p-0.5 transition-colors hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
      aria-label="Toggle theme"
    >
      <div className="rounded-full bg-white p-1 transition-colors dark:bg-transparent">
        <Sun className="size-3 text-neutral-900 dark:text-neutral-500" />
      </div>
      <div className="rounded-full bg-transparent p-1 transition-colors dark:bg-neutral-700">
        <Moon className="size-3 text-neutral-500 dark:text-white" />
      </div>
    </button>
  );
}
