"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function ThemeSwitcher() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  if (!mounted) {
    return <div className="h-11 w-16 rounded-full bg-neutral-200 p-1 dark:bg-neutral-800" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-11 w-16 items-center justify-center gap-1 rounded-full bg-neutral-200 p-1 transition-colors hover:bg-neutral-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:bg-neutral-800 dark:hover:bg-neutral-700"
      aria-label="Toggle theme"
    >
      <div className={`rounded-full p-1.5 transition-colors ${!isDark ? "bg-white" : "bg-transparent"}`}>
        <Sun className={`size-3.5 ${!isDark ? "text-neutral-900" : "text-neutral-500"}`} />
      </div>
      <div
        className={`rounded-full p-1.5 transition-colors ${
          isDark ? "bg-neutral-900 dark:bg-neutral-700" : "bg-transparent"
        }`}
      >
        <Moon className={`size-3.5 ${isDark ? "text-white" : "text-neutral-500"}`} />
      </div>
    </button>
  );
}
